import type { LocalStorage } from "@raycast/api";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { getStoredConfig, type ConfigFormValue } from "./configuration";
import {
  ensurePunchIsAllowed,
  enterPassword,
  prepareRecorderPage,
  readTodayPunchTimes,
  selectEmployee,
  selectPunchAction,
  submitPunchAndWaitForHistory,
} from "./punch-page";
import { addPunchTime, type TodayPunchTimes } from "./punch-policy";
import type { Action, ValueOf } from "./types/types";

interface Props extends ConfigFormValue {
  dryRun?: boolean;
  devtools?: boolean;
}

interface PunchResult {
  isSuccess: boolean;
  isFailed: boolean;
  isProcessing: boolean;
  error: unknown;
  punchedAt?: string;
  todayPunchTimes?: TodayPunchTimes;
}

export class KingOfTime {
  static Action = {
    Attend: "attend",
    Leave: "leave",
  } as const;

  static GetConfigFrom = async (localStorage: typeof LocalStorage): Promise<ConfigFormValue> => {
    return getStoredConfig(localStorage);
  };

  public output: PunchResult = {
    isSuccess: false,
    isFailed: false,
    isProcessing: false,
    error: "",
  };

  constructor(private props: Props) {}

  #start = (): PunchResult => ({
    isSuccess: false,
    isFailed: false,
    isProcessing: true,
    error: "",
  });

  #success = (punchedAt?: string, todayPunchTimes?: TodayPunchTimes): PunchResult => ({
    isSuccess: true,
    isFailed: false,
    isProcessing: false,
    error: "",
    punchedAt,
    todayPunchTimes,
  });

  #failed = (error: unknown): PunchResult => ({
    isSuccess: false,
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
      let punchedAt: string | undefined;
      let todayPunchTimes: TodayPunchTimes | undefined;
      await this.#withPreparedPage(async (page) => {
        if (!this.props.dryRun) todayPunchTimes = await ensurePunchIsAllowed(page, action, this.props.username);
        await selectPunchAction(page, action);
        await selectEmployee(page, this.props.username);
        await enterPassword(page, this.props.password);
        if (!this.props.dryRun) {
          punchedAt = await submitPunchAndWaitForHistory(page, action, this.props.username);
          todayPunchTimes = punchedAt ? addPunchTime(todayPunchTimes ?? {}, action, punchedAt) : undefined;
        }
      });
      this.output = this.#success(punchedAt, todayPunchTimes);
      return this.output;
    } catch (error) {
      this.output = this.#failed(error);
      return this.output;
    }
  }
}
