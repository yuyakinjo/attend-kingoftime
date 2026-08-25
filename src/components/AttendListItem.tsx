import { Action, ActionPanel, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { KingOfTime } from "../punch-script";
import { iconUrl } from "./Punch";

const props = {
  label: `出勤 🏢🏃🏻‍♀️`,
  message: "おはようございます🌞",
};

interface AttendItemProps {
  onPunchSuccess?: () => void;
  subtitle: string;
}

const onAction = async (onPunchSuccess?: () => void) => {
  await showToast(Toast.Style.Animated, `${props.label}...`);
  try {
    const config = await KingOfTime.GetConfigFrom(LocalStorage);
    const { isFailed, isSuccess, error } = await new KingOfTime(config).punch(KingOfTime.Action.Attend);
    if (isSuccess) {
      await showToast(Toast.Style.Success, `${props.message}`);
      onPunchSuccess?.();
    }
    if (isFailed) await showToast(Toast.Style.Failure, `${error}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast(Toast.Style.Failure, message);
  }
};

export const AttendItem = ({ onPunchSuccess, subtitle }: AttendItemProps) => (
  <>
    <List.Item
      id="attend"
      title={props.label}
      subtitle={subtitle}
      icon={{ source: iconUrl }}
      actions={
        <ActionPanel>
          <Action title={props.label} onAction={() => onAction(onPunchSuccess)} />
        </ActionPanel>
      }
    />
  </>
);
