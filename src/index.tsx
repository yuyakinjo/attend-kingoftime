import { LocalStorage } from "@raycast/api";
import { Punch } from "./components/Punch";
import { usePromise } from "@raycast/utils";
import { ConfigFormValue, ConfigForms } from "./components/ConfigForms";
import { ListEmptyView } from "./components/List.EmptyView";

export default function Command() {
  const { isLoading, data } = usePromise(() => LocalStorage.allItems<ConfigFormValue>());
  return isLoading ? <ListEmptyView /> : data?.username || data?.password ? <Punch /> : <ConfigForms />;
}
