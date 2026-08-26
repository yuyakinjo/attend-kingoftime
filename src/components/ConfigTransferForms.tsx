import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import type { ConfigFormValue } from "../configuration";
import { exportConfigFile, importConfigFile } from "../config-transfer";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));
const requireSinglePath = (message: string) => (paths: string[] | undefined) =>
  paths?.length === 1 ? undefined : message;

interface ImportConfigFormValues {
  configFile: string[];
}

interface ImportConfigFormProps {
  onImport: (config: ConfigFormValue) => unknown | Promise<unknown>;
}

export const ImportConfigForm = ({ onImport }: ImportConfigFormProps) => {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<ImportConfigFormValues>({
    onSubmit: async ({ configFile }) => {
      let config: ConfigFormValue;
      try {
        config = await importConfigFile(configFile[0]);
        await onImport(config);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "設定JSONを読み込めません",
          message: getErrorMessage(error),
        });
        return false;
      }

      pop();
      await showToast({
        style: Toast.Style.Success,
        title: "設定JSONを読み込みました",
        message: "内容を確認して「更新」を押してください。",
      });
    },
    validation: {
      configFile: requireSinglePath("設定JSONを1つ選択してください。"),
    },
  });

  return (
    <Form
      navigationTitle="設定JSONをインポート"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="フォームに読み込む" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="JSONを読み込んだ後、設定内容を確認して「更新」を押すと保存されます。" />
      <Form.FilePicker
        {...itemProps.configFile}
        title="設定JSON"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
      />
    </Form>
  );
};

interface ExportConfigFormValues {
  directory: string[];
}

interface ExportConfigFormProps {
  config: ConfigFormValue;
}

export const ExportConfigForm = ({ config }: ExportConfigFormProps) => {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<ExportConfigFormValues>({
    onSubmit: async ({ directory }) => {
      let confirmed = false;
      try {
        confirmed = await confirmAlert({
          icon: Icon.Warning,
          title: "認証情報をJSONへ保存しますか？",
          message: "設定JSONは暗号化されず、パスワードやCookieトークンも含まれます。安全に保管してください。",
          primaryAction: {
            title: "保存する",
            style: Alert.ActionStyle.Default,
          },
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "確認画面を表示できません",
          message: getErrorMessage(error),
        });
        return false;
      }
      if (!confirmed) return;

      await showToast(Toast.Style.Animated, "設定JSONを書き出しています…").catch(() => undefined);
      let filePath: string;
      try {
        filePath = await exportConfigFile(directory[0], config);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "設定JSONを書き出せません",
          message: getErrorMessage(error),
        });
        return false;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "設定JSONを書き出しました",
        message: "選択したフォルダに保存しました。",
      });
      pop();
      await showInFinder(filePath).catch(() => undefined);
    },
    validation: {
      directory: requireSinglePath("保存先フォルダを1つ選択してください。"),
    },
  });

  return (
    <Form
      navigationTitle="設定JSONをエクスポート"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="JSONを書き出す" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="注意"
        text="設定JSONは暗号化されず、パスワードやCookieトークンも含まれます。ファイルを安全に保管してください。"
      />
      <Form.FilePicker
        {...itemProps.directory}
        title="保存先フォルダ"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
};
