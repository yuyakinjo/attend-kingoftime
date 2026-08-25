import { Action, ActionPanel, Icon, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { KingOfTime } from "../punch-script";
import { iconUrl } from "./Punch";

export const getDateString = (date = new Date()) => `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`;

const action = "attend";

export const props = {
  action,
  column: `${getDateString()}-${action}`,
  label: `出勤 🏢🏃🏻‍♀️`,
  message: "おはようございます🌞",
  done: true,
  subtitle: "king of time",
};

const onAction = async () => {
  await showToast(Toast.Style.Animated, `${props.label}...`);
  try {
    const config = await KingOfTime.GetConfigFrom(LocalStorage);
    const { isFailed, isSuccess, error } = await new KingOfTime(config).punch(KingOfTime.Action.Attend);
    if (isSuccess) {
      await showToast(Toast.Style.Success, `${props.message}`);
      const dateString = getDateString();
      await LocalStorage.setItem(`${dateString}-${props.action}`, props.done);
    }
    if (isFailed) await showToast(Toast.Style.Failure, `${error}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast(Toast.Style.Failure, message);
  }
};

export const AttendItem = () => (
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
            title="出勤済みにする"
            icon={Icon.Check}
            onAction={async () => {
              showToast(Toast.Style.Animated, "処理中...");
              await LocalStorage.setItem(props.column, props.done);
              showToast(Toast.Style.Success, "出勤済みにしました");
            }}
          ></Action>
          <Action
            title="出勤データの削除"
            icon={Icon.Trash}
            onAction={async () => {
              showToast(Toast.Style.Animated, "削除中...");
              await LocalStorage.removeItem(props.column);
              showToast(Toast.Style.Success, "出勤データを削除しました");
            }}
          ></Action>
        </ActionPanel>
      }
    />
  </>
);
