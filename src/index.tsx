import { LocalStorage } from "@raycast/api";
import { Punch } from "./components/Punch";
import { usePromise } from "@raycast/utils";
import { ConfigForms } from "./components/ConfigForms";
import { ListEmptyView } from "./components/List.EmptyView";
import { loadConfigSnapshot } from "./configuration";

export default function Command() {
  const { isLoading, data, revalidate } = usePromise(() => loadConfigSnapshot(LocalStorage));
  return isLoading ? <ListEmptyView /> : data?.config ? <Punch /> : <ConfigForms onSaved={revalidate} />;
}
