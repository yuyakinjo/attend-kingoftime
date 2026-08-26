import type { Page } from "puppeteer";

interface WaitOptions {
  timeout: number;
  signal?: AbortSignal;
}

interface NewPunchHistoryEntry {
  actionLabel: "出勤" | "退勤";
  previousHistoryLines: string[];
  username: string;
}

const historyEntriesAreRendered = (expectedCount: number) =>
  document.querySelector("#log")?.querySelectorAll("br").length === expectedCount;

const recorderTranslationsAreLoaded = () => {
  const data = (window as typeof window & { i18nData?: { CloudRecorder016?: unknown } }).i18nData;
  return typeof data?.CloudRecorder016 === "string";
};

const recorderDateIsLoaded = () => {
  const date = document.querySelector<HTMLInputElement>("#date")?.value.trim() ?? "";
  return /^\d{1,2}\/\d{1,2}$/u.test(date);
};

const visiblePasswordInputHasExpectedValue = (expectedPassword: string) =>
  Array.from(document.querySelectorAll<HTMLInputElement>(".input_password")).some(
    (input) => input.getClientRects().length > 0 && input.value === expectedPassword,
  );

const readHistoryLines = (log: Element) => {
  const copy = log.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return (copy.textContent ?? "")
    .split(/\r?\n/u)
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean);
};

const findNewPunchHistoryEntry = ({ actionLabel, previousHistoryLines, username }: NewPunchHistoryEntry) => {
  const log = document.querySelector<HTMLElement>("#log");
  if (!log) return false;

  const normalize = (value: string) => value.replace(/\s+/gu, " ").trim();
  const copy = log.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  const currentHistoryLines = (copy.textContent ?? "").split(/\r?\n/u).map(normalize).filter(Boolean);
  const remainingPreviousLines = new Map<string, number>();

  for (const line of previousHistoryLines) {
    remainingPreviousLines.set(line, (remainingPreviousLines.get(line) ?? 0) + 1);
  }

  const normalizedUsername = normalize(username);
  for (const line of currentHistoryLines) {
    const previousCount = remainingPreviousLines.get(line) ?? 0;
    if (previousCount > 0) {
      remainingPreviousLines.set(line, previousCount - 1);
      continue;
    }

    const match = line.match(/^(\d{1,2}\/\d{1,2})\s+(\d{1,2}:\d{2})\s*(出勤|退勤)\s+(.+)$/u);
    if (match?.[3] === actionLabel && match[4] === normalizedUsername) return `${match[1]} ${match[2]}`;
  }

  return false;
};

export const waitForHistoryEntriesRendered = async (page: Page, expectedCount: number, options: WaitOptions) => {
  await page.waitForFunction(historyEntriesAreRendered, { polling: "mutation", ...options }, expectedCount);
};

export const waitForRecorderTranslationsLoaded = async (page: Page, options: WaitOptions) => {
  await page.waitForFunction(recorderTranslationsAreLoaded, { polling: "raf", ...options });
};

export const waitForRecorderDateLoaded = async (page: Page, options: WaitOptions) => {
  await page.waitForFunction(recorderDateIsLoaded, { polling: "raf", ...options });
};

export const waitForVisiblePasswordInputValue = async (page: Page, expectedPassword: string, options: WaitOptions) => {
  await page.waitForFunction(visiblePasswordInputHasExpectedValue, { polling: "raf", ...options }, expectedPassword);
};

export const readPunchHistoryLines = async (page: Page) => page.$eval("#log", readHistoryLines);

export const readRecorderDate = async (page: Page) =>
  page.$eval("#date", (element) => (element as HTMLInputElement).value.trim());

export const waitForNewPunchHistoryEntry = async (
  page: Page,
  expectedEntry: NewPunchHistoryEntry,
  options: WaitOptions,
) => {
  const entry = await page.waitForFunction(
    findNewPunchHistoryEntry,
    { polling: "mutation", ...options },
    expectedEntry,
  );
  try {
    const punchedAt = await entry.jsonValue();
    if (typeof punchedAt !== "string") throw new Error("新しい打刻履歴の日時を確認できませんでした。");
    return punchedAt;
  } finally {
    await entry.dispose();
  }
};
