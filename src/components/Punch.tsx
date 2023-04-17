import { ActionPanel, List, LocalStorage, Action, showToast, Toast, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { props as attendProps, AttendItem } from "./AttendAction";
import { props as leaveProps, LeaveItem } from "./LeaveAction";
import { GoToAdminSite } from "./GoToAdminSite";

export const iconUrl = "https://s3.kingtime.jp/favicon.ico";

const settings = {
  navigationTitle: "King of Time 打刻",
  placeholder: "打刻Typeを検索",
  loading: "Loading...",
  allDone: "本日は打刻済みです",
  done: true,
  iconUrl,
};

function ActionItem() {
  const { isLoading, data } = usePromise(async () => {
    const [isAttend, isLeave] = await Promise.all([
      LocalStorage.getItem(attendProps.column),
      LocalStorage.getItem(leaveProps.column),
    ]);
    return { isAttend, isLeave };
  });

  return (
    <>
      <LeaveItem />
      <AttendItem />
      <GoToAdminSite />
    </>
  );
}

export const Punch = (props: List.Props) => {
  return (
    <List
      {...props}
      filtering={false}
      navigationTitle={settings.navigationTitle}
      searchBarPlaceholder={settings.placeholder}
    >
      <ActionItem />
    </List>
  );
};
