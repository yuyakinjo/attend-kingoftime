import { LocalStorage } from "@raycast/api";
import type { ConfigFormValue } from "./configuration";

const recorderHostCacheKey = "attend-kingoftime.recorder-host.v1";

export interface RecorderTarget {
  hostname: string;
  protocol: "http:" | "https:";
}

interface RecorderHostCacheValue {
  version: 1;
  sourceUrl: string;
  tokenKey: string;
  target: RecorderTarget;
}

type RecorderHostConfig = Pick<ConfigFormValue, "kingOfTimeUrl" | "tokenKey">;

const normalizeSourceUrl = (value: string) => new URL(value).href;

const parseRecorderTarget = (value: unknown): RecorderTarget | undefined => {
  if (!value || typeof value !== "object") return undefined;

  const { hostname, protocol } = value as Partial<RecorderTarget>;
  if (typeof hostname !== "string" || !hostname.trim()) return undefined;
  if (protocol !== "http:" && protocol !== "https:") return undefined;

  try {
    const parsed = new URL(`${protocol}//${hostname}`);
    if (parsed.hostname !== hostname) return undefined;
  } catch {
    return undefined;
  }

  return { hostname, protocol };
};

const parseCacheValue = (value: unknown): RecorderHostCacheValue | undefined => {
  if (typeof value !== "string") return undefined;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return undefined;

    const cacheValue = parsed as Partial<RecorderHostCacheValue>;
    const target = parseRecorderTarget(cacheValue.target);
    if (
      cacheValue.version !== 1 ||
      typeof cacheValue.sourceUrl !== "string" ||
      typeof cacheValue.tokenKey !== "string" ||
      !target
    ) {
      return undefined;
    }

    return { version: 1, sourceUrl: cacheValue.sourceUrl, tokenKey: cacheValue.tokenKey, target };
  } catch {
    return undefined;
  }
};

export const getCachedRecorderTarget = async (config: RecorderHostConfig) => {
  const cached = parseCacheValue(await LocalStorage.getItem<string>(recorderHostCacheKey));
  if (!cached) return undefined;
  if (cached.sourceUrl !== normalizeSourceUrl(config.kingOfTimeUrl) || cached.tokenKey !== config.tokenKey) {
    return undefined;
  }
  return cached.target;
};

export const saveCachedRecorderTarget = async (config: RecorderHostConfig, target: RecorderTarget) => {
  const value: RecorderHostCacheValue = {
    version: 1,
    sourceUrl: normalizeSourceUrl(config.kingOfTimeUrl),
    tokenKey: config.tokenKey,
    target,
  };
  await LocalStorage.setItem(recorderHostCacheKey, JSON.stringify(value));
};
