import { createHash } from "node:crypto";
import { configKeys, type ConfigFormValue } from "./configuration";
import type { TodayPunchTimes } from "./punch-page";

export interface HistorySnapshot {
  version: 1;
  dateKey: string;
  configScope: string;
  times: TodayPunchTimes;
}

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getHistoryConfigScope = (config: ConfigFormValue) => {
  const values = configKeys.map((key) => config[key]);
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
};

const parseTodayPunchTimes = (value: unknown): TodayPunchTimes | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const { attend, leave } = value as TodayPunchTimes;
  if (attend !== undefined && typeof attend !== "string") return undefined;
  if (leave !== undefined && typeof leave !== "string") return undefined;
  return { attend, leave };
};

export const createHistorySnapshot = (
  config: ConfigFormValue,
  times: TodayPunchTimes,
  now = new Date(),
): HistorySnapshot => ({
  version: 1,
  dateKey: getDateKey(now),
  configScope: getHistoryConfigScope(config),
  times,
});

export const getValidHistorySnapshot = (
  value: unknown,
  config: ConfigFormValue,
  now = new Date(),
): HistorySnapshot | undefined => {
  if (!value || typeof value !== "object") return undefined;

  const snapshot = value as Partial<HistorySnapshot>;
  const times = parseTodayPunchTimes(snapshot.times);
  if (
    snapshot.version !== 1 ||
    snapshot.dateKey !== getDateKey(now) ||
    snapshot.configScope !== getHistoryConfigScope(config) ||
    !times
  ) {
    return undefined;
  }

  return {
    version: 1,
    dateKey: snapshot.dateKey,
    configScope: snapshot.configScope,
    times,
  };
};
