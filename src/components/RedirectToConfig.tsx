import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { ConfigForms } from "./ConfigForms";

export const RedirectToConfig = () => {
  const { push } = useNavigation();

  return (
    <List.Item
      title="設定編集画面"
      icon={Icon.Cog}
      actions={
        <ActionPanel title="設定編集">
          <ActionPanel.Section>
            <Action title="設定編集" onAction={() => push(<ConfigForms />)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    ></List.Item>
  );
};
