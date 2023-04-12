import { Action, ActionPanel, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { punch } from "../punch-script";

export const getDateString = (date = new Date()) => `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`;

const action = "attend";

export const props = {
  action,
  column: `${getDateString()}-${action}`,
  label: `✅ 出勤`,
  message: "おはようございます🌞",
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

export const AttendItem = () => (
  <>
    <List.Item
      key={props.action}
      title={props.label}
      subtitle={props.subtitle}
      actions={
        <ActionPanel>
          <Action title={props.label} onAction={onAction} />
        </ActionPanel>
      }
    />
  </>
);
