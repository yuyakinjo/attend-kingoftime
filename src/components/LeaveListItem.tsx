import { Action, ActionPanel, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { KingOfTime } from "../punch-script";
import { iconUrl } from "./Punch";

const props = {
  label: `退勤 🏠🏃🏻`,
  message: "お疲れ様でした👋🏻",
};

interface LeaveItemProps {
  onPunchSuccess?: (punchedAt?: string) => void;
  subtitle: string;
}

const onAction = async (onPunchSuccess?: (punchedAt?: string) => void) => {
  await showToast(Toast.Style.Animated, `${props.label}...`);
  try {
    const config = await KingOfTime.GetConfigFrom(LocalStorage);
    const { isFailed, isSuccess, error, punchedAt } = await new KingOfTime(config).punch(KingOfTime.Action.Leave);
    if (isSuccess) {
      onPunchSuccess?.(punchedAt);
      await showToast(Toast.Style.Success, `${props.message}`);
    }
    if (isFailed) await showToast(Toast.Style.Failure, `${error}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast(Toast.Style.Failure, message);
  }
};

export const LeaveItem = ({ onPunchSuccess, subtitle }: LeaveItemProps) => (
  <>
    <List.Item
      id="leave"
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
