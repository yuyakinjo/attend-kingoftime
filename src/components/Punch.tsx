import { List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import type { ConfigFormValue } from "../configuration";
import {
  createHistorySnapshot,
  getValidHistorySnapshot,
  isSameLocalDate,
  type HistorySnapshot,
} from "../history-snapshot";
import { getPunchDisplayState, type PunchAction, type TodayPunchTimes } from "../punch-policy";
import { KingOfTime } from "../punch-script";
import { AttendItem } from "./AttendListItem";
import { LeaveItem } from "./LeaveListItem";
import { GoToAdminSite } from "./GoToAdminSite";
import { RedirectToConfig } from "./RedirectToConfig";

export const iconUrl = "https://s3.kingtime.jp/favicon.ico";

const settings = {
  navigationTitle: "King of Time 打刻",
  placeholder: "打刻種別を選択",
};

interface PunchProps extends List.Props {
  config: ConfigFormValue;
  onConfigSaved?: () => unknown | Promise<unknown>;
}

const loadTodayPunchSnapshot = async (config: ConfigFormValue) => {
  const requestedAt = new Date();
  const punchTimes = await new KingOfTime(config).getTodayPunchTimes();
  return createHistorySnapshot(config, punchTimes, requestedAt);
};

const getHistorySubtitle = (
  time: string | undefined,
  hasSnapshot: boolean,
  isLoading: boolean,
  error: Error | undefined,
) => {
  if (time) return time;
  if (hasSnapshot) return "未打刻";
  if (isLoading) return "履歴を取得中…";
  if (error) return "履歴を取得できません";
  return "未打刻";
};

export const Punch = ({ config, onConfigSaved, ...props }: PunchProps) => {
  const [cachedSnapshot, setCachedSnapshot] = useCachedState<HistorySnapshot | undefined>("latest-history", undefined, {
    cacheNamespace: "attend-kingoftime.history.v1",
  });
  const { data, error, isLoading, mutate, revalidate } = usePromise(loadTodayPunchSnapshot, [config], {
    failureToastOptions: { title: "打刻履歴を取得できませんでした" },
    onData: (snapshot) => setCachedSnapshot(snapshot),
  });
  const [currentDay, setCurrentDay] = useState(() => new Date());
  const latestRevalidate = useRef(revalidate);
  latestRevalidate.current = revalidate;

  useEffect(() => {
    const now = new Date();
    if (!isSameLocalDate(currentDay, now)) {
      setCurrentDay(now);
      void latestRevalidate.current();
      return;
    }

    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeout = setTimeout(
      () => {
        setCurrentDay(new Date());
        void latestRevalidate.current();
      },
      nextDay.getTime() - now.getTime() + 100,
    );

    return () => clearTimeout(timeout);
  }, [currentDay]);

  const fetchedSnapshot = getValidHistorySnapshot(data, config, currentDay);
  const validCachedSnapshot = getValidHistorySnapshot(cachedSnapshot, config, currentDay);
  const displayedSnapshot = fetchedSnapshot ?? validCachedSnapshot;

  const revalidateHistory = async () => {
    await onConfigSaved?.();
    void revalidate();
  };
  const refreshHistory = () => void revalidate();
  const updateHistoryAfterPunch = async (todayPunchTimes?: TodayPunchTimes) => {
    if (!todayPunchTimes) {
      void revalidate();
      return;
    }

    const updatedSnapshot = createHistorySnapshot(config, todayPunchTimes);
    await mutate(Promise.resolve(), {
      optimisticUpdate: () => updatedSnapshot,
      rollbackOnError: false,
      shouldRevalidateAfter: false,
    });
    setCachedSnapshot(updatedSnapshot);
  };

  const hasSnapshot = Boolean(displayedSnapshot);
  const times = displayedSnapshot?.times;
  const displayState = getPunchDisplayState(times);
  const statusActions = [...displayState.missed, ...displayState.completed];

  const renderPunchItem = (action: PunchAction, isActionable: boolean) => {
    const isMissed = displayState.missed.includes(action);
    const subtitle = isMissed
      ? "未打刻（申請が必要）"
      : getHistorySubtitle(times?.[action], hasSnapshot, isLoading, error);

    return action === "attend" ? (
      <AttendItem
        key={action}
        isActionable={isActionable}
        onPunchFailure={refreshHistory}
        subtitle={subtitle}
        onPunchSuccess={updateHistoryAfterPunch}
      />
    ) : (
      <LeaveItem
        key={action}
        isActionable={isActionable}
        onPunchFailure={refreshHistory}
        subtitle={subtitle}
        onPunchSuccess={updateHistoryAfterPunch}
      />
    );
  };

  return (
    <List
      {...props}
      filtering={false}
      isLoading={props.isLoading || (isLoading && !hasSnapshot)}
      navigationTitle={settings.navigationTitle}
      searchBarPlaceholder={settings.placeholder}
    >
      <List.Section title={hasSnapshot ? "未打刻" : "打刻種別"}>
        {displayState.actionable.map((action) => renderPunchItem(action, true))}
      </List.Section>
      {statusActions.length > 0 ? (
        <List.Section title="本日の状況">{statusActions.map((action) => renderPunchItem(action, false))}</List.Section>
      ) : null}
      <List.Section title="その他">
        <GoToAdminSite />
        <RedirectToConfig onSaved={revalidateHistory} />
      </List.Section>
    </List>
  );
};
