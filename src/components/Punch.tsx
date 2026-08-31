import { List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useRef } from "react";
import type { ConfigFormValue } from "../configuration";
import { createHistorySnapshot, getValidHistorySnapshot, type HistorySnapshot } from "../history-snapshot";
import { KingOfTime } from "../punch-script";
import type { TodayPunchTimes } from "../punch-page";
import { AttendItem } from "./AttendListItem";
import { LeaveItem } from "./LeaveListItem";
import { GoToAdminSite } from "./GoToAdminSite";
import { RedirectToConfig } from "./RedirectToConfig";

export const iconUrl = "https://s3.kingtime.jp/favicon.ico";

const settings = {
  navigationTitle: "King of Time 打刻",
  placeholder: "打刻Typeを検索",
};

interface PunchProps extends List.Props {
  config: ConfigFormValue;
  onConfigSaved?: () => unknown | Promise<unknown>;
}

const loadTodayPunchSnapshot = async (config: ConfigFormValue) => {
  const punchTimes = await new KingOfTime(config).getTodayPunchTimes();
  return createHistorySnapshot(config, punchTimes);
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
  const fetchedSnapshot = getValidHistorySnapshot(data, config);
  const validCachedSnapshot = getValidHistorySnapshot(cachedSnapshot, config);
  const displayedSnapshot = fetchedSnapshot ?? validCachedSnapshot;
  const latestDisplayedSnapshot = useRef(displayedSnapshot);
  latestDisplayedSnapshot.current = displayedSnapshot;

  const revalidateHistory = async () => {
    await onConfigSaved?.();
    void revalidate();
  };
  const updateHistoryAfterPunch = (action: keyof TodayPunchTimes) => async (punchedAt?: string) => {
    if (!punchedAt) {
      void revalidate();
      return;
    }

    const currentSnapshot = latestDisplayedSnapshot.current;
    if (!currentSnapshot) {
      void revalidate();
      return;
    }

    const updatedSnapshot = createHistorySnapshot(config, {
      ...currentSnapshot.times,
      [action]: punchedAt,
    });
    await mutate(Promise.resolve(), {
      optimisticUpdate: () => updatedSnapshot,
      rollbackOnError: false,
      shouldRevalidateAfter: false,
    });
    setCachedSnapshot(updatedSnapshot);
  };

  const hasSnapshot = Boolean(displayedSnapshot);
  const times = displayedSnapshot?.times;

  return (
    <List
      {...props}
      filtering={false}
      isLoading={props.isLoading || (isLoading && !hasSnapshot)}
      navigationTitle={settings.navigationTitle}
      searchBarPlaceholder={settings.placeholder}
    >
      <AttendItem
        subtitle={getHistorySubtitle(times?.attend, hasSnapshot, isLoading, error)}
        onPunchSuccess={updateHistoryAfterPunch("attend")}
      />
      <LeaveItem
        subtitle={getHistorySubtitle(times?.leave, hasSnapshot, isLoading, error)}
        onPunchSuccess={updateHistoryAfterPunch("leave")}
      />
      <GoToAdminSite />
      <RedirectToConfig onSaved={revalidateHistory} />
    </List>
  );
};
