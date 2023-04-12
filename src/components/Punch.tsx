import { List, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { props as attendProps, AttendItem } from "./AttendAction";
import { props as leaveProps, LeaveItem } from "./LeaveAction";

const props = {
  navigationTitle: "King of Time 打刻",
  placeholder: "打刻Typeを検索",
  loading: "Loading...",
  allDone: "本日は打刻済みです",
  done: true,
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
      {isLoading ? (
        <List.Item title={props.loading} />
      ) : data?.isAttend && data?.isLeave ? (
        <List.Item title={props.allDone} />
      ) : data?.isAttend ? (
        <LeaveItem />
      ) : (
        <AttendItem />
      )}
    </>
  );
}

export const Punch = () => {
  return (
    <List filtering={false} navigationTitle={props.navigationTitle} searchBarPlaceholder={props.placeholder}>
      <ActionItem />
    </List>
  );
};
