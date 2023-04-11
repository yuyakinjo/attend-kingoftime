import { useEffect, useState } from "react";
import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";
import { punch } from "../punch-script";

const items = [
  { action: "attend", label: `✅ 出勤`, message: "おはようございます🌞" },
  { action: "leave", label: `🏠 退勤`, message: "お疲れ様でした👋🏻" },
];

type Items = typeof items;

export const PunchList = () => {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(items);

  const onAction = async (item: Items[number]) => {
    showToast(Toast.Style.Animated, `${item.label}中...`);
    const { isFailed, isSuccess, error } = await punch(item.action);
    if (isSuccess) showToast(Toast.Style.Success, `${item.message}`);
    if (isFailed) showToast(Toast.Style.Failure, `${error}`);
    return;
  };

  useEffect(() => {
    filterList(items.filter((item) => item.action.includes(searchText)));
  }, [searchText]);

  return (
    <List
      filtering={true}
      onSearchTextChange={setSearchText}
      navigationTitle="King of Time 打刻"
      searchBarPlaceholder="打刻Typeを検索"
      searchText={searchText}
    >
      {filteredList.map((item) => (
        <List.Item
          key={item.action}
          title={item.label}
          actions={
            <ActionPanel>
              <Action title={item.label} onAction={() => onAction(item)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
