import { TimeoutError, type Dialog, type HTTPResponse, type Page } from "puppeteer";
import type { ConfigFormValue } from "./configuration";
import {
  readPunchHistoryLines,
  waitForHistoryEntriesRendered,
  waitForNewPunchHistoryEntry,
  waitForRecorderTranslationsLoaded,
  waitForVisiblePasswordInputValue,
} from "./punch-waits";

const INTERACTION_TIMEOUT_MS = 15_000;
const PUNCH_COMPLETION_TIMEOUT_MS = 180_000;

type PunchAction = "attend" | "leave";
type RecorderConfig = Pick<ConfigFormValue, "kingOfTimeUrl" | "token" | "tokenKey">;

const actionSelector: Record<PunchAction, string> = {
  attend: "#attend",
  leave: "#leave",
};

const actionLabel: Record<PunchAction, "出勤" | "退勤"> = {
  attend: "出勤",
  leave: "退勤",
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

  const [historyResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/get_log_list"),
      { timeout: PUNCH_COMPLETION_TIMEOUT_MS },
    ),
    page.goto(config.kingOfTimeUrl),
  ]);

  const historyCount = await getHistoryCount(historyResponse);
  await waitForHistoryEntriesRendered(page, historyCount, { timeout: INTERACTION_TIMEOUT_MS });
  await waitForRecorderTranslationsLoaded(page, { timeout: PUNCH_COMPLETION_TIMEOUT_MS });
};

export const selectPunchAction = async (page: Page, action: PunchAction) => {
  await waitForSelectorAndClick(page, actionSelector[action]);
};

export const selectEmployee = async (page: Page, username: string) => {
  await waitForSelectorAndClick(page, employeeSelector(username));
};

export const enterPassword = async (page: Page, password: string) => {
  await visiblePasswordInput(page).fill(password);
  await waitForVisiblePasswordInputValue(page, password, { timeout: INTERACTION_TIMEOUT_MS });
};

export const submitPunchAndWaitForHistory = async (page: Page, action: PunchAction, username: string) => {
  const previousHistoryLines = await readPunchHistoryLines(page);
  const abortController = new AbortController();
  let dialogHandler: ((dialog: Dialog) => void) | undefined;
  const dialogError = new Promise<never>((_, reject) => {
    dialogHandler = (dialog) => {
      const message = dialog.message().trim() || "詳細不明のエラー";
      void dialog.dismiss().finally(() => reject(new Error(`KING OF TIMEで打刻に失敗しました: ${message}`)));
    };
    page.on("dialog", dialogHandler);
  });
  const recordResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/record_timestamp_and_log"),
    { signal: abortController.signal, timeout: PUNCH_COMPLETION_TIMEOUT_MS },
  );

  try {
    await visibleSubmitButton(page).click();
    const recordResponse = await Promise.race([recordResponsePromise, dialogError]);
    if (!recordResponse.ok()) throw new Error(`打刻リクエストに失敗しました (${recordResponse.status()})`);

    const recordResponseBody = await recordResponse.text();
    if (!recordResponseBody.startsWith("result=OK")) {
      throw new Error("打刻が受理されませんでした。KING OF TIMEの画面で状態を確認してください。");
    }

    try {
      await Promise.race([
        waitForNewPunchHistoryEntry(
          page,
          { actionLabel: actionLabel[action], previousHistoryLines, username },
          { signal: abortController.signal, timeout: PUNCH_COMPLETION_TIMEOUT_MS },
        ),
        dialogError,
      ]);
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new Error(
          "打刻処理は受理されましたが、履歴への反映を確認できませんでした。二重打刻を避けるため、KING OF TIMEの履歴を確認してから再実行してください。",
        );
      }
      throw error;
    }
  } finally {
    abortController.abort();
    if (dialogHandler) page.off("dialog", dialogHandler);
  }
};
