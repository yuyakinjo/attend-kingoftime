import { Action, ActionPanel, List, LocalStorage, Toast, showToast } from "@raycast/api";
import type { TodayPunchTimes } from "../punch-policy";
import { KingOfTime } from "../punch-script";
import { iconUrl } from "./Punch";

const props = {
  label: `退勤 🏠🏃🏻`,
  message: "お疲れ様でした👋🏻",
};

interface LeaveItemProps {
  isActionable?: boolean;
  onPunchFailure?: () => void;
  onPunchSuccess?: (todayPunchTimes?: TodayPunchTimes) => void | Promise<void>;
  subtitle: string;
}

const onAction = async (
  onPunchSuccess?: (todayPunchTimes?: TodayPunchTimes) => void | Promise<void>,
  onPunchFailure?: () => void,
) => {
  await showToast(Toast.Style.Animated, `${props.label}...`);
  try {
    const config = await KingOfTime.GetConfigFrom(LocalStorage);
    const { isFailed, isSuccess, error, todayPunchTimes } = await new KingOfTime(config).punch(KingOfTime.Action.Leave);
    if (isSuccess) {
      await onPunchSuccess?.(todayPunchTimes);
      await showToast(Toast.Style.Success, `${props.message}`);
    }
    if (isFailed) {
      onPunchFailure?.();
      await showToast(Toast.Style.Failure, `${error}`);
    }
  } catch (error) {
    onPunchFailure?.();
    const message = error instanceof Error ? error.message : String(error);
    await showToast(Toast.Style.Failure, message);
  }
};

export const LeaveItem = ({ isActionable = true, onPunchFailure, onPunchSuccess, subtitle }: LeaveItemProps) => (
  <>
    <List.Item
      id="leave"
      title={props.label}
      subtitle={subtitle}
      icon={{ source: iconUrl }}
      actions={
        isActionable ? (
          <ActionPanel>
            <Action title={props.label} onAction={() => onAction(onPunchSuccess, onPunchFailure)} />
          </ActionPanel>
        ) : undefined
      }
    />
  </>
);
