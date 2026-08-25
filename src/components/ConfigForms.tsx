import { Action, ActionPanel, Cache, Form, LocalStorage, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation, usePromise } from "@raycast/utils";
import {
  configKeys,
  type ConfigFormValue,
  getConfigError,
  getConfigInitialValues,
  loadConfigSnapshot,
  saveConfig,
} from "../configuration";

export type { ConfigFormValue } from "../configuration";

interface ConfigFormsProps extends Form.Props {
  onSaved?: () => unknown | Promise<unknown>;
}

const cache = new Cache();

const getCachedValues = () => {
  return Object.fromEntries(
    configKeys.map((key) => {
      const cachedValue = cache.get(key);
      if (!cachedValue || cachedValue === "undefined") return [key, undefined];

      try {
        const parsedValue: unknown = JSON.parse(cachedValue);
        return [key, typeof parsedValue === "string" ? parsedValue : undefined];
      } catch {
        return [key, cachedValue];
      }
    }),
  );
};

const ConfigForm = ({ onSaved, initialValues, ...props }: ConfigFormsProps & { initialValues: ConfigFormValue }) => {
  const { handleSubmit, itemProps } = useForm<ConfigFormValue>({
    onSubmit: async (values) => {
      const error = getConfigError(values);
      if (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "設定を保存できません",
          message: error,
        });
        return;
      }

      try {
        await saveConfig(LocalStorage, values);
        configKeys.forEach((key) => cache.remove(key));
        await showToast({
          style: Toast.Style.Success,
          title: "更新しました",
          message: "設定を保存しました",
        });
        await onSaved?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "設定を保存できません",
          message,
        });
      }
    },
    validation: {
      kingOfTimeUrl: FormValidation.Required,
      username: FormValidation.Required,
      password: FormValidation.Required,
      token: FormValidation.Required,
      tokenKey: FormValidation.Required,
    },
    initialValues,
  });

  return (
    <Form
      {...props}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="更新" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.kingOfTimeUrl}
        title="打刻URL"
        placeholder="打刻画面のURLです"
        info="打刻画面のURLです"
      />
      <Form.TextField
        {...itemProps.username}
        title="ユーザーネーム"
        placeholder="打刻画面の名前です"
        info="打刻画面に表示されている名前です"
      />
      <Form.PasswordField
        {...itemProps.password}
        title="パスワード"
        placeholder="打刻時のパスワードです"
        info="打刻時に入力されるパスワードです"
      />
      <Form.TextField
        {...itemProps.tokenKey}
        title="トークン名"
        placeholder="打刻画面に付与されているcookieの名前です"
        info="打刻画面で、htjwt_** という名前のcookieが付与されているので、その名前を入力してください"
      />
      <Form.PasswordField
        {...itemProps.token}
        title="トークン名で取得した値"
        placeholder="打刻画面に付与されているcookieの値です"
        info="打刻画面で、htjwt_** という名前のcookieが付与されているので、その値を入力してください"
      />
    </Form>
  );
};

export const ConfigForms = ({ onSaved, ...props }: ConfigFormsProps) => {
  const { data, isLoading, error } = usePromise(async () => {
    const snapshot = await loadConfigSnapshot(LocalStorage);
    return getConfigInitialValues(snapshot.draft, getCachedValues());
  });

  if (error) {
    return (
      <Form {...props}>
        <Form.Description text="設定を読み込めませんでした。Raycastを再起動して、もう一度お試しください。" />
      </Form>
    );
  }

  if (isLoading || !data) {
    return (
      <Form {...props}>
        <Form.Description text="設定を読み込んでいます…" />
      </Form>
    );
  }
  return <ConfigForm {...props} onSaved={onSaved} initialValues={data} />;
};
