import { Action, ActionPanel, Icon, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { punch } from "../punch-script";
import { getDateString } from "./AttendAction";
import { iconUrl } from "./Punch";

const action = "leave";

export const props = {
  action,
  column: `${getDateString()}-${action}`,
  label: `退勤 🏠🏃🏻`,
  message: "お疲れ様でした👋🏻",
  done: true,
  subtitle: "king of time",
};

const onAction = async () => {
  showToast(Toast.Style.Animated, `${props.label}中...`);
  const { isFailed, isSuccess, error } = await punch(props.action);
  if (isSuccess) {
    showToast(Toast.Style.Success, `${props.message}`);
    const dateString = getDateString();
    await LocalStorage.setItem(`${dateString}-${props.action}`, props.done);
  }
  if (isFailed) showToast(Toast.Style.Failure, `${error}`);
  return;
};

export const LeaveItem = () => (
  <>
    <List.Item
      key={props.action}
      title={props.label}
      subtitle={props.subtitle}
      icon={{ source: iconUrl }}
      actions={
        <ActionPanel>
          <Action title={props.label} onAction={onAction} />
          <Action
            title="退勤データの削除"
            icon={Icon.Trash}
            onAction={async () => {
              showToast(Toast.Style.Animated, "削除中...");
              await LocalStorage.removeItem(props.column);
              showToast(Toast.Style.Success, `${props.label}データを削除しました`);
            }}
          ></Action>
        </ActionPanel>
      }
    />
  </>
);
