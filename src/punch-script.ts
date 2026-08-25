import type { LocalStorage } from "@raycast/api";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { getStoredConfig, type ConfigFormValue } from "./configuration";
import {
  ensurePunchIsNotDuplicate,
  enterPassword,
  prepareRecorderPage,
  readTodayPunchTimes,
  selectEmployee,
  selectPunchAction,
  submitPunchAndWaitForHistory,
  type TodayPunchTimes,
} from "./punch-page";
import type { Action, ValueOf } from "./types/types";

interface Props extends ConfigFormValue {
  dryRun?: boolean;
  devtools?: boolean;
}

export class KingOfTime {
  static Action = {
    Attend: "attend",
    Leave: "leave",
  } as const;

  static GetConfigFrom = async (localStorage: typeof LocalStorage): Promise<ConfigFormValue> => {
    return getStoredConfig(localStorage);
  };

  public output = {
    isSuccess: false,
    isFailed: false,
    isProcessing: false,
    error: "",
  };

  constructor(private props: Props) {}

  #start = () => ({ ...this.output, isProcessing: true });

  #success = () => ({ ...this.output, isSuccess: true, isProcessing: false });

  #failed = (error: unknown) => ({
    ...this.output,
    isFailed: true,
    isProcessing: false,
    error,
  });

  async #withPreparedPage<Result>(callback: (page: Page) => Promise<Result>) {
    let browser: Browser | undefined;
    try {
      browser = await puppeteer.launch({ devtools: this.props.devtools ?? false });
      const page = await browser.newPage();
      await prepareRecorderPage(page, this.props);
      return await callback(page);
    } finally {
      try {
        await browser?.close();
      } catch {
        // Keep the operation result when browser cleanup fails.
      }
    }
  }

  async getTodayPunchTimes(): Promise<TodayPunchTimes> {
    return this.#withPreparedPage((page) => readTodayPunchTimes(page, this.props.username));
  }

  async punch(action: ValueOf<Action> = KingOfTime.Action.Attend) {
    this.output = this.#start();
    try {
      await this.#withPreparedPage(async (page) => {
        if (!this.props.dryRun) await ensurePunchIsNotDuplicate(page, action, this.props.username);
        await selectPunchAction(page, action);
        await selectEmployee(page, this.props.username);
        await enterPassword(page, this.props.password);
        if (!this.props.dryRun) await submitPunchAndWaitForHistory(page, action, this.props.username);
      });
      return this.#success();
    } catch (error) {
      return this.#failed(error);
    }
  }
}
