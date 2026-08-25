import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { ConfigForms } from "./ConfigForms";

interface RedirectToConfigProps {
  onSaved?: () => unknown | Promise<unknown>;
}

export const RedirectToConfig = ({ onSaved }: RedirectToConfigProps) => {
  const { push } = useNavigation();

  return (
    <List.Item
      title="設定編集画面"
      icon={Icon.Cog}
      actions={
        <ActionPanel title="設定編集">
          <ActionPanel.Section>
            <Action title="設定編集" onAction={() => push(<ConfigForms onSaved={onSaved} />)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    ></List.Item>
  );
};
