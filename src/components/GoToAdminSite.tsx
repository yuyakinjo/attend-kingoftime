import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { kingOfTimeAdminUrl } from "../config";

export const GoToAdminSite = () => {
  return (
    <List.Item
      title="ブラウザで申請画面を開く"
      icon={Icon.Globe}
      actions={
        <ActionPanel title="申請画面">
          <ActionPanel.Section>
            <Action.OpenInBrowser title="申請画面" icon={Icon.Cog} url={kingOfTimeAdminUrl} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    ></List.Item>
  );
};
