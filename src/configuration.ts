import type { LocalStorage } from "@raycast/api";

export const configKeys = ["kingOfTimeUrl", "username", "password", "tokenKey", "token"] as const;
export const configStorageKey = "attend-kingoftime.config.v1";

export type ConfigKey = (typeof configKeys)[number];

export interface ConfigFormValue {
  kingOfTimeUrl: string;
  username: string;
  password: string;
  tokenKey: string;
  token: string;
}

const configLabels: Record<ConfigKey, string> = {
  kingOfTimeUrl: "打刻URL",
  username: "ユーザーネーム",
  password: "パスワード",
  tokenKey: "トークン名",
  token: "トークン値",
};

const getConfigField = (values: unknown, key: ConfigKey) => {
  if (!values || typeof values !== "object") return undefined;
  const value = (values as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
};

const hasConfigField = (values: unknown, key: ConfigKey) => {
  const value = getConfigField(values, key);
  if (value === undefined) return false;
  return key === "password" || key === "token" ? value.length > 0 : value.trim().length > 0;
};

export const getConfigError = (values: unknown) => {
  const missingKeys = configKeys.filter((key) => !hasConfigField(values, key));
  if (missingKeys.length > 0) {
    const labels = missingKeys.map((key) => configLabels[key]).join("、");
    return `設定が不足しています: ${labels}。設定画面で入力して更新してください。`;
  }

  const kingOfTimeUrl = getConfigField(values, "kingOfTimeUrl") as string;
  try {
    const url = new URL(kingOfTimeUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported protocol");
  } catch {
    return "打刻URLが正しくありません。http:// または https:// で始まるURLを設定してください。";
  }

  const tokenKey = getConfigField(values, "tokenKey") as string;
  if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(tokenKey)) {
    return "トークン名にCookie名として使えない文字が含まれています。";
  }

  return undefined;
};

export const isConfigComplete = (values: unknown): values is ConfigFormValue => getConfigError(values) === undefined;

export const requireConfig = (values: unknown): ConfigFormValue => {
  const error = getConfigError(values);
  if (error) throw new Error(error);

  return Object.fromEntries(configKeys.map((key) => [key, getConfigField(values, key)])) as unknown as ConfigFormValue;
};

export const getConfigInitialValues = (...sources: unknown[]): ConfigFormValue => {
  return Object.fromEntries(
    configKeys.map((key) => {
      const value = sources
        .map((source) => getConfigField(source, key))
        .find((item) => item !== undefined && (key === "password" || key === "token" ? item.length > 0 : item.trim()));
      return [key, value ?? ""];
    }),
  ) as unknown as ConfigFormValue;
};

interface ConfigStorageValue {
  version: 1;
  config: ConfigFormValue;
}

export interface ConfigSnapshot {
  config?: ConfigFormValue;
  draft: ConfigFormValue;
}

const parseStoredConfig = (value: unknown) => {
  if (typeof value !== "string") return undefined;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return undefined;
    const storedValue = parsed as Partial<ConfigStorageValue>;
    if (storedValue.version !== 1 || !isConfigComplete(storedValue.config)) return undefined;
    return requireConfig(storedValue.config);
  } catch {
    return undefined;
  }
};

export const loadConfigSnapshot = async (localStorage: typeof LocalStorage): Promise<ConfigSnapshot> => {
  const [storedValue, legacyValues] = await Promise.all([
    localStorage.getItem<string>(configStorageKey),
    localStorage.allItems(),
  ]);
  const storedConfig = parseStoredConfig(storedValue);
  const legacyConfig = isConfigComplete(legacyValues) ? requireConfig(legacyValues) : undefined;
  const config = storedConfig ?? legacyConfig;

  return {
    config,
    draft: getConfigInitialValues(config, legacyValues),
  };
};

export const getStoredConfig = async (localStorage: typeof LocalStorage) => {
  const snapshot = await loadConfigSnapshot(localStorage);
  return snapshot.config ?? requireConfig(snapshot.draft);
};

export const saveConfig = async (localStorage: typeof LocalStorage, values: unknown) => {
  const config = requireConfig(values);
  const storedValue: ConfigStorageValue = { version: 1, config };
  await localStorage.setItem(configStorageKey, JSON.stringify(storedValue));

  const savedConfig = parseStoredConfig(await localStorage.getItem(configStorageKey));
  if (!savedConfig) throw new Error("設定を保存できませんでした。もう一度お試しください。");

  await Promise.allSettled(configKeys.map((key) => localStorage.removeItem(key)));
  return savedConfig;
};
