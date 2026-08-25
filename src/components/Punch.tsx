import { List, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { KingOfTime } from "../punch-script";
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
  const { data, error, isLoading, revalidate } = usePromise(loadTodayPunchTimes, [], {
    failureToastOptions: { title: "打刻履歴を取得できませんでした" },
  });
  const revalidateHistory = () => void revalidate();

  return (
    <List
      {...props}
      filtering={false}
      isLoading={props.isLoading || isLoading}
      navigationTitle={settings.navigationTitle}
      searchBarPlaceholder={settings.placeholder}
    >
      <AttendItem subtitle={getHistorySubtitle(data?.attend, isLoading, error)} onPunchSuccess={revalidateHistory} />
      <LeaveItem subtitle={getHistorySubtitle(data?.leave, isLoading, error)} onPunchSuccess={revalidateHistory} />
      <GoToAdminSite />
      <RedirectToConfig onSaved={revalidateHistory} />
    </List>
  );
};
