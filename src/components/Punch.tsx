import { List, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
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

const loadTodayPunchTimes = async () => {
  const config = await KingOfTime.GetConfigFrom(LocalStorage);
  return new KingOfTime(config).getTodayPunchTimes();
};

const getHistorySubtitle = (time: string | undefined, isLoading: boolean, error: Error | undefined) => {
  if (time) return time;
  if (isLoading) return "履歴を取得中…";
  if (error) return "履歴を取得できません";
  return "未打刻";
};

export const Punch = (props: List.Props) => {
  const [latestPunchTimes, setLatestPunchTimes] = useState<TodayPunchTimes>({});
  const { data, error, isLoading, revalidate } = usePromise(loadTodayPunchTimes, [], {
    failureToastOptions: { title: "打刻履歴を取得できませんでした" },
  });
  const revalidateHistory = () => {
    setLatestPunchTimes({});
    void revalidate();
  };
  const updateHistoryAfterPunch = (action: keyof TodayPunchTimes) => (punchedAt?: string) => {
    if (!punchedAt) return void revalidate();

    setLatestPunchTimes((current) => ({ ...current, [action]: punchedAt }));
  };

  return (
    <List
      {...props}
      filtering={false}
      isLoading={props.isLoading || isLoading}
      navigationTitle={settings.navigationTitle}
      searchBarPlaceholder={settings.placeholder}
    >
      <AttendItem
        subtitle={getHistorySubtitle(latestPunchTimes.attend ?? data?.attend, isLoading, error)}
        onPunchSuccess={updateHistoryAfterPunch("attend")}
      />
      <LeaveItem
        subtitle={getHistorySubtitle(latestPunchTimes.leave ?? data?.leave, isLoading, error)}
        onPunchSuccess={updateHistoryAfterPunch("leave")}
      />
      <GoToAdminSite />
      <RedirectToConfig onSaved={revalidateHistory} />
    </List>
  );
};
