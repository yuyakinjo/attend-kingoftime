export const punchActionOrder = ["attend", "leave"] as const;

export type PunchAction = (typeof punchActionOrder)[number];
export type PunchActionBlockReason = "duplicate" | "day-closed";

export interface TodayPunchTimes {
  attend?: string;
  leave?: string;
}

export interface PunchDisplayState {
  actionable: PunchAction[];
  completed: PunchAction[];
  missed: PunchAction[];
}

const hasPunchTime = (time: string | undefined) => Boolean(time);

export const getPunchActionBlockReason = (
  times: TodayPunchTimes,
  action: PunchAction,
): PunchActionBlockReason | undefined => {
  if (hasPunchTime(times[action])) return "duplicate";
  if (action === "attend" && hasPunchTime(times.leave)) return "day-closed";
  return undefined;
};

export const addPunchTime = (times: TodayPunchTimes, action: PunchAction, punchedAt: string): TodayPunchTimes => ({
  ...times,
  [action]: punchedAt,
});

export const getPunchDisplayState = (times: TodayPunchTimes | undefined): PunchDisplayState => {
  if (!times) {
    return {
      actionable: [...punchActionOrder],
      completed: [],
      missed: [],
    };
  }

  const completed = punchActionOrder.filter((action) => hasPunchTime(times[action]));
  const actionable = punchActionOrder.filter((action) => getPunchActionBlockReason(times, action) === undefined);

  return {
    actionable,
    completed,
    // A leave punch closes the day. A missing attend punch must be corrected
    // by application instead of offering a late attend punch after leaving.
    missed: hasPunchTime(times.leave) && !hasPunchTime(times.attend) ? ["attend"] : [],
  };
};
