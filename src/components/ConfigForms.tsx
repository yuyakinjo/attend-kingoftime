import { Action, ActionPanel, Form, LocalStorage, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation, useCachedState } from "@raycast/utils";

export interface ConfigFormValue {
  username: string;
  password: string;
  kingOfTimeUrl: string;
  tokenKey: string;
  token: string;
}

export const ConfigForms = (props: Form.Props) => {
  const [username, setUsername] = useCachedState<ConfigFormValue["username"]>("username");
  const [password, setPassword] = useCachedState<ConfigFormValue["password"]>("password");
  const [kingOfTimeUrl, setkingOfTimeUrl] = useCachedState<ConfigFormValue["kingOfTimeUrl"]>("kingOfTimeUrl");
  const [tokenKey, setTokenKey] = useCachedState<ConfigFormValue["tokenKey"]>("tokenKey");
  const [token, setToken] = useCachedState<ConfigFormValue["token"]>("token");

  const { handleSubmit, itemProps, setValue } = useForm<ConfigFormValue>({
    onSubmit: async (values) => {
      const updateValues = Object.entries(values).map(([key, value]) => LocalStorage.setItem(key, value));
      await Promise.all(updateValues);
      showToast({
        style: Toast.Style.Success,
        title: `更新しました`,
        message: `Settings saved!`,
      });
    },
    validation: {
      username: FormValidation.Required,
      password: FormValidation.Required,
      token: FormValidation.Required,
      tokenKey: FormValidation.Required,
    },
    initialValues: {
      username,
      password,
      kingOfTimeUrl,
      token,
      tokenKey,
    },
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
        onChange={(value: ConfigFormValue["kingOfTimeUrl"]) => {
          setkingOfTimeUrl(value);
          setValue("kingOfTimeUrl", value);
        }}
      />
      <Form.TextField
        {...itemProps.username}
        title="ユーザーネーム"
        placeholder="打刻画面の名前です"
        info="打刻画面に表示されている名前です"
        onChange={(value: ConfigFormValue["username"]) => {
          setUsername(value);
          setValue("username", value);
        }}
      />
      <Form.PasswordField
        {...itemProps.password}
        title="パスワード"
        placeholder="打刻時のパスワードです"
        info="打刻時に入力されるパスワードです"
        onChange={(value: ConfigFormValue["password"]) => {
          setPassword(value);
          setValue("password", value);
        }}
      />
      <Form.TextField
        {...itemProps.tokenKey}
        title="トークン名"
        placeholder="打刻画面に付与されているcookieの名前です"
        info="打刻画面で、htjwt_** という名前のcookieが付与されているので、その名前を入力してください"
        onChange={(value: ConfigFormValue["tokenKey"]) => {
          setTokenKey(value);
          setValue("tokenKey", value);
        }}
      />
      <Form.PasswordField
        {...itemProps.token}
        title="トークン名で取得した値"
        placeholder="打刻画面に付与されているcookieの値です"
        info="打刻画面で、htjwt_** という名前のcookieが付与されているので、その値を入力してください"
        onChange={(value: ConfigFormValue["token"]) => {
          setToken(value);
          setValue("token", value);
        }}
      />
    </Form>
  );
};
