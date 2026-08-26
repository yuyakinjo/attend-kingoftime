import { TimeoutError, type Dialog, type HTTPRequest, type HTTPResponse, type Page } from "puppeteer";
import type { ConfigFormValue } from "./configuration";
import {
  readPunchHistoryLines,
  readRecorderDate,
  waitForHistoryEntriesRendered,
  waitForNewPunchHistoryEntry,
  waitForRecorderDateLoaded,
  waitForRecorderTranslationsLoaded,
  waitForVisiblePasswordInputValue,
} from "./punch-waits";

const INTERACTION_TIMEOUT_MS = 10_000; // 10秒で操作が完了しなければ、打刻画面の初期化に失敗したと判断
const PUNCH_COMPLETION_TIMEOUT_MS = 10_000; // 10秒で打刻完了を確認できなければ、履歴反映の確認に失敗したと判断
const RECORDER_DATE_ERROR = "打刻画面の日付を確認できないため、重複チェックを実行できませんでした。";
const RECORDER_READY_ERROR = "打刻画面の初期化を10秒以内に確認できませんでした。もう一度お試しください。";
const HISTORY_LOAD_ERROR = "打刻履歴を10秒以内に読み込めませんでした。通信状態を確認してもう一度お試しください。";
const HISTORY_DATE_ERROR = "打刻画面の日付を確認できないため、本日の打刻履歴を取得できませんでした。";

type PunchAction = "attend" | "leave";
type RecorderConfig = Pick<ConfigFormValue, "kingOfTimeUrl" | "token" | "tokenKey">;

interface PunchHistoryEntry {
  date: string;
  time: string;
}

export interface TodayPunchTimes {
  attend?: string;
  leave?: string;
}

const actionSelector: Record<PunchAction, string> = {
  attend: "#attend",
  leave: "#leave",
};

const actionLabel: Record<PunchAction, "出勤" | "退勤"> = {
  attend: "出勤",
  leave: "退勤",
};

const normalizeHistoryText = (value: string) => value.replace(/\s+/gu, " ").trim();

const normalizeRecorderDate = (value: string) => {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})$/u);
  return match ? `${Number(match[1])}/${Number(match[2])}` : undefined;
};

const findPunchEntry = (historyLines: string[], expectedDate: string, action: PunchAction, username: string) => {
  const expectedUsername = normalizeHistoryText(username);

  for (const line of historyLines) {
    const match = line.match(/^(\d{1,2}\/\d{1,2})\s+(\d{1,2}:\d{2})\s*(出勤|退勤)\s+(.+)$/u);
    if (
      match &&
      normalizeRecorderDate(match[1]) === expectedDate &&
      match[3] === actionLabel[action] &&
      normalizeHistoryText(match[4]) === expectedUsername
    ) {
      return { date: match[1], time: match[2] } satisfies PunchHistoryEntry;
    }
  }

  return undefined;
};

const formatPunchDateTime = (entry: PunchHistoryEntry | undefined) =>
  entry ? `${entry.date} ${entry.time}` : undefined;

const readCurrentRecorderHistory = async (page: Page) => {
  await waitForRecorderDateLoaded(page, { timeout: INTERACTION_TIMEOUT_MS });
  const [recorderDate, historyLines] = await Promise.all([readRecorderDate(page), readPunchHistoryLines(page)]);
  return { expectedDate: normalizeRecorderDate(recorderDate), historyLines };
};

const escapeCssString = (value: string) =>
  Array.from(value, (character) => {
    const codePoint = character.codePointAt(0)!;
    if (codePoint === 0) return "\uFFFD";
    if ((codePoint >= 1 && codePoint <= 31) || codePoint === 127) return `\\${codePoint.toString(16)} `;
    return character === '"' || character === "\\" ? `\\${character}` : character;
  }).join("");

const employeeSelector = (username: string) => `.button-color-employee[value="${escapeCssString(username)}"]`;

const waitForSelectorAndClick = async (page: Page, selector: string) => {
  await page.locator(selector).click();
};

const visiblePasswordInput = (page: Page) =>
  page.locator(() =>
    Array.from(document.querySelectorAll<HTMLInputElement>(".input_password")).find(
      (input) => input.getClientRects().length > 0,
    )!,
  );

const visibleSubmitButton = (page: Page) =>
  page.locator(() =>
    Array.from(document.querySelectorAll<HTMLElement>(".ok_password")).find(
      (button) => button.getClientRects().length > 0 && !button.matches(":disabled"),
    )!,
  );

const getHistoryCount = async (response: HTTPResponse) => {
  if (!response.ok()) throw new Error(`打刻履歴の取得に失敗しました (${response.status()})`);

  const responseBody: unknown = await response.json();
  const logList =
    responseBody && typeof responseBody === "object" ? (responseBody as { logList?: unknown }).logList : false;
  const historyCount = logList == null ? 0 : Array.isArray(logList) ? logList.length : undefined;
  if (historyCount === undefined) throw new Error("打刻履歴の応答形式を確認できませんでした");
  return historyCount;
};

const isRecorderEndpointUrl = (url: string, endpoint: string) => {
  const pathname = new URL(url).pathname.replace(/\/+$/u, "");
  return pathname.split("/").at(-1) === endpoint;
};

const isRecorderPostRequest = (request: HTTPRequest, endpoint: string) =>
  request.method() === "POST" && isRecorderEndpointUrl(request.url(), endpoint);

export const prepareRecorderPage = async (page: Page, config: RecorderConfig) => {
  page.setDefaultTimeout(INTERACTION_TIMEOUT_MS);
  await page.goto(config.kingOfTimeUrl);

  const cookieUrl = new URL(page.url());
  await page.browserContext().setCookie({
    name: config.tokenKey,
    value: config.token,
    domain: cookieUrl.hostname,
    path: "/",
    secure: cookieUrl.protocol === "https:",
  });

  const abortController = new AbortController();
  const historyRequests = new WeakSet<HTTPRequest>();
  const historyRequestHandler = (request: HTTPRequest) => {
    if (isRecorderPostRequest(request, "get_log_list")) historyRequests.add(request);
  };
  page.on("request", historyRequestHandler);
  const historyResponsePromise = page.waitForResponse((response) => historyRequests.has(response.request()), {
    signal: abortController.signal,
    timeout: 0,
  });
  // Prevent a rejection from being reported as unhandled while navigation is in progress.
  void historyResponsePromise.catch(() => undefined);

  try {
    // Start measuring the history timeout after navigation. The response listener
    // is registered before navigation so that a fast response cannot be missed.
    await page.goto(config.kingOfTimeUrl);

    try {
      const historyReady = await Promise.race([
        historyResponsePromise.then((response) => ({ kind: "response" as const, response })),
        page
          .waitForSelector("#log br", { signal: abortController.signal, timeout: INTERACTION_TIMEOUT_MS })
          .then(() => ({ kind: "rendered" as const })),
      ]);

      // A rendered row is sufficient because KING OF TIME appends all rows in one
      // synchronous loop. The response fallback is needed when the history is empty.
      if (historyReady.kind === "response") {
        const historyCount = await getHistoryCount(historyReady.response);
        await waitForHistoryEntriesRendered(page, historyCount, { timeout: INTERACTION_TIMEOUT_MS });
      }
    } catch (error) {
      if (error instanceof TimeoutError) throw new Error(HISTORY_LOAD_ERROR);
      throw error;
    }
  } finally {
    abortController.abort();
    page.off("request", historyRequestHandler);
  }
};

export const selectPunchAction = async (page: Page, action: PunchAction) => {
  await waitForSelectorAndClick(page, actionSelector[action]);
};

export const ensurePunchIsNotDuplicate = async (page: Page, action: PunchAction, username: string) => {
  let recorderHistory: Awaited<ReturnType<typeof readCurrentRecorderHistory>>;
  try {
    recorderHistory = await readCurrentRecorderHistory(page);
  } catch (error) {
    if (error instanceof TimeoutError) throw new Error(RECORDER_DATE_ERROR);
    throw error;
  }

  const { expectedDate, historyLines } = recorderHistory;
  if (!expectedDate) throw new Error(RECORDER_DATE_ERROR);

  const duplicateEntry = findPunchEntry(historyLines, expectedDate, action, username);

  if (duplicateEntry) {
    throw new Error(
      `本日 ${duplicateEntry.time} にすでに「${actionLabel[action]}」を打刻済みです。重複打刻を防ぐため処理を中止しました。`,
    );
  }
};

export const readTodayPunchTimes = async (page: Page, username: string): Promise<TodayPunchTimes> => {
  let recorderHistory: Awaited<ReturnType<typeof readCurrentRecorderHistory>>;
  try {
    recorderHistory = await readCurrentRecorderHistory(page);
  } catch (error) {
    if (error instanceof TimeoutError) throw new Error(HISTORY_DATE_ERROR);
    throw error;
  }

  const { expectedDate, historyLines } = recorderHistory;
  if (!expectedDate) throw new Error(HISTORY_DATE_ERROR);

  return {
    attend: formatPunchDateTime(findPunchEntry(historyLines, expectedDate, "attend", username)),
    leave: formatPunchDateTime(findPunchEntry(historyLines, expectedDate, "leave", username)),
  };
};

export const selectEmployee = async (page: Page, username: string) => {
  try {
    await waitForRecorderTranslationsLoaded(page, { timeout: INTERACTION_TIMEOUT_MS });
  } catch (error) {
    if (error instanceof TimeoutError) throw new Error(RECORDER_READY_ERROR);
    throw error;
  }

  await waitForSelectorAndClick(page, employeeSelector(username));
};

export const enterPassword = async (page: Page, password: string) => {
  await visiblePasswordInput(page).fill(password);
  await waitForVisiblePasswordInputValue(page, password, { timeout: INTERACTION_TIMEOUT_MS });
};

export const submitPunchAndWaitForHistory = async (page: Page, action: PunchAction, username: string) => {
  const previousHistoryLines = await readPunchHistoryLines(page);
  const abortController = new AbortController();
  let recordObservationTimeout: ReturnType<typeof setTimeout> | undefined;
  let dialogHandler: ((dialog: Dialog) => void) | undefined;
  const dialogError = new Promise<never>((_, reject) => {
    dialogHandler = (dialog) => {
      const message = dialog.message().trim() || "詳細不明のエラー";
      void dialog.dismiss().finally(() => reject(new Error(`KING OF TIMEで打刻に失敗しました: ${message}`)));
    };
    page.on("dialog", dialogHandler);
  });
  const historyEntryPromise = waitForNewPunchHistoryEntry(
    page,
    { actionLabel: actionLabel[action], previousHistoryLines, username },
    { signal: abortController.signal, timeout: PUNCH_COMPLETION_TIMEOUT_MS },
  );
  const historyResultPromise = historyEntryPromise.then(
    (punchedAt) => ({ kind: "history" as const, punchedAt }),
    (error: unknown) => ({ kind: "history-error" as const, error }),
  );
  const recordObservationPromise = page
    .waitForResponse((response) => isRecorderPostRequest(response.request(), "record_timestamp_and_log"), {
      signal: abortController.signal,
      timeout: 0,
    })
    .then(async (response) => {
      if (!response.ok()) throw new Error(`打刻リクエストに失敗しました (${response.status()})`);

      const responseBody = (await response.text()).trim();
      if (!responseBody.startsWith("result=OK")) {
        throw new Error("打刻が受理されませんでした。KING OF TIMEの画面で状態を確認してください。");
      }

      return { kind: "accepted" as const };
    });
  const recordObservationTimeoutPromise = new Promise<{ kind: "unobserved" }>((resolve) => {
    recordObservationTimeout = setTimeout(() => resolve({ kind: "unobserved" }), PUNCH_COMPLETION_TIMEOUT_MS);
  });
  const recordResultPromise = Promise.race([recordObservationPromise, recordObservationTimeoutPromise]);
  const completionPromise = Promise.race([historyResultPromise, recordResultPromise, dialogError]);
  // The history timer starts before clicking so that a fast DOM update cannot be missed.
  void completionPromise.catch(() => undefined);

  try {
    await visibleSubmitButton(page).click();
    try {
      const completion = await completionPromise;
      if (completion.kind === "history") return completion.punchedAt;

      if (completion.kind === "accepted") {
        const historyResult = await Promise.race([historyResultPromise, dialogError]);
        // result=OK is sufficient to treat the punch as successful. When the
        // history DOM cannot be observed, the caller reloads it as a fallback.
        return historyResult.kind === "history" ? historyResult.punchedAt : undefined;
      }

      if (completion.kind === "history-error") {
        const recordResult = await Promise.race([recordResultPromise, dialogError]);
        if (recordResult.kind === "accepted") return undefined;
        throw completion.error;
      }

      const historyResult = await Promise.race([historyResultPromise, dialogError]);
      if (historyResult.kind === "history") return historyResult.punchedAt;
      throw historyResult.error;
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new Error(
          "打刻完了を10秒以内に確認できませんでした。二重打刻を避けるため、KING OF TIMEの履歴を確認してから再実行してください。",
        );
      }
      throw error;
    }
  } finally {
    abortController.abort();
    if (recordObservationTimeout) clearTimeout(recordObservationTimeout);
    if (dialogHandler) page.off("dialog", dialogHandler);
  }
};
