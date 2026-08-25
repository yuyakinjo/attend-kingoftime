import type { LocalStorage } from "@raycast/api";
import puppeteer, { type Browser } from "puppeteer";
import { getStoredConfig, type ConfigFormValue } from "./configuration";
import {
  enterPassword,
  prepareRecorderPage,
  selectEmployee,
  selectPunchAction,
  submitPunchAndWaitForHistory,
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

  async punch(action: ValueOf<Action> = KingOfTime.Action.Attend) {
    this.output = this.#start();
    let browser: Browser | undefined;
    try {
      browser = await puppeteer.launch({ devtools: this.props.devtools ?? false });
      const page = await browser.newPage();
      await prepareRecorderPage(page, this.props);
      await selectPunchAction(page, action);
      await selectEmployee(page, this.props.username);
      await enterPassword(page, this.props.password);
      if (!this.props.dryRun) await submitPunchAndWaitForHistory(page, action, this.props.username);
      return this.#success();
    } catch (error) {
      return this.#failed(error);
    } finally {
      try {
        await browser?.close();
      } catch {
        // Keep the punch result when browser cleanup fails.
      }
    }
  }
}
