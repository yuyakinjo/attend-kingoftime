import { Action, ActionPanel, Form, LocalStorage, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation, useCachedState } from "@raycast/utils";

export interface ConfigFormValue {
  username: string;
  password: string;
}

export const ConfigForms = (props: Form.Props) => {
  const [username, setUsername] = useCachedState<ConfigFormValue["username"]>("username");
  const [password, setPassword] = useCachedState<ConfigFormValue["password"]>("password");

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
    },
    initialValues: {
      username,
      password,
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
    </Form>
  );
};
