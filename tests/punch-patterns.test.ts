import { describe, expect, test } from "bun:test";
import type { ConfigFormValue } from "../src/configuration";
import { createHistorySnapshot, getValidHistorySnapshot, isSameLocalDate } from "../src/history-snapshot";
import {
  addPunchTime,
  getPunchActionBlockReason,
  getPunchDisplayState,
  type PunchDisplayState,
  type TodayPunchTimes,
} from "../src/punch-policy";

const config: ConfigFormValue = {
  kingOfTimeUrl: "https://example.com/recorder",
  username: "test-user",
  password: "password",
  tokenKey: "token-key",
  token: "token-value",
};

const workday = (hour: number, minute = 0) => new Date(2026, 8, 3, hour, minute);
const nextWorkday = new Date(2026, 8, 4, 10, 0);

interface PunchPattern {
  name: string;
  snapshotAt: Date;
  times: TodayPunchTimes;
  today: PunchDisplayState;
}

const patterns: PunchPattern[] = [
  {
    name: "通常勤務",
    snapshotAt: workday(19),
    times: { attend: "9/3 10:00", leave: "9/3 19:00" },
    today: { actionable: [], completed: ["attend", "leave"], missed: [] },
  },
  {
    name: "午前休",
    snapshotAt: workday(19),
    times: { attend: "9/3 14:00", leave: "9/3 19:00" },
    today: { actionable: [], completed: ["attend", "leave"], missed: [] },
  },
  {
    name: "午後休",
    snapshotAt: workday(14),
    times: { attend: "9/3 10:00", leave: "9/3 14:00" },
    today: { actionable: [], completed: ["attend", "leave"], missed: [] },
  },
  {
    name: "出勤打刻を忘れて退勤だけ打刻",
    snapshotAt: workday(19),
    times: { leave: "9/3 19:00" },
    today: { actionable: [], completed: ["leave"], missed: ["attend"] },
  },
  {
    name: "退勤打刻を忘れた",
    snapshotAt: workday(10),
    times: { attend: "9/3 10:00" },
    today: { actionable: ["leave"], completed: ["attend"], missed: [] },
  },
];

describe("打刻パターン", () => {
  test("当日が未打刻なら出勤と退勤を選べる", () => {
    expect(getPunchDisplayState({})).toEqual({
      actionable: ["attend", "leave"],
      completed: [],
      missed: [],
    });
  });

  test("日付境界をまたいだ描画を検出する", () => {
    expect(isSameLocalDate(workday(23, 59), new Date(2026, 8, 4, 0, 0))).toBe(false);
  });

  test("退勤後の出勤打刻は申請対象として拒否する", () => {
    expect(getPunchActionBlockReason({ leave: "9/3 19:00" }, "attend")).toBe("day-closed");
  });

  test("打刻直前の判定でも重複を拒否し、正しい次の打刻だけを許可する", () => {
    expect(getPunchActionBlockReason({}, "attend")).toBeUndefined();
    expect(getPunchActionBlockReason({}, "leave")).toBeUndefined();
    expect(getPunchActionBlockReason({ attend: "9/3 10:00" }, "attend")).toBe("duplicate");
    expect(getPunchActionBlockReason({ attend: "9/3 10:00" }, "leave")).toBeUndefined();
    expect(getPunchActionBlockReason({ leave: "9/3 19:00" }, "leave")).toBe("duplicate");
  });

  test("ライブ履歴を保持したまま成功した打刻を追加する", () => {
    expect(addPunchTime({ attend: "9/3 10:00" }, "leave", "9/3 19:00")).toEqual({
      attend: "9/3 10:00",
      leave: "9/3 19:00",
    });
  });

  for (const pattern of patterns) {
    test(`${pattern.name}: 当日の打刻状態を表示する`, () => {
      const snapshot = createHistorySnapshot(config, pattern.times, pattern.snapshotAt);
      const current = getValidHistorySnapshot(snapshot, config, workday(23, 59));

      expect(current?.times).toEqual(pattern.times);
      expect(getPunchDisplayState(current?.times)).toEqual(pattern.today);
    });

    test(`${pattern.name}: 翌日は前日のキャッシュを引き継がない`, () => {
      const snapshot = createHistorySnapshot(config, pattern.times, pattern.snapshotAt);
      const nextDaySnapshot = getValidHistorySnapshot(snapshot, config, nextWorkday);

      expect(nextDaySnapshot).toBeUndefined();
      expect(getPunchDisplayState(nextDaySnapshot?.times)).toEqual({
        actionable: ["attend", "leave"],
        completed: [],
        missed: [],
      });
    });
  }
});
