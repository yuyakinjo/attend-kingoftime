import type { LocalStorage } from "@raycast/api";
import puppeteer, { type Browser } from "puppeteer";
import { getStoredConfig, type ConfigFormValue } from "./configuration";
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

  #selector = {
    password: {
      dialog: "#password_dialog",
      input: ".input_password",
      ok: ".ok_password",
    },
    action: {
      attend: "#attend",
      leave: "#leave",
    },
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

  #getTarget(action: ValueOf<Action> = KingOfTime.Action.Attend) {
    const isAttend = action === KingOfTime.Action.Attend;
    return isAttend ? this.#selector.action.attend : this.#selector.action.leave;
  }

  #getUserSelector() {
    return {
      name: `[value*='${this.props.username}']`,
      title: `[title*='${this.props.username}']`,
    };
  }

  async punch(action?: ValueOf<Action>) {
    const waitForTimeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    this.output = this.#start();
    let browser: Browser | undefined;
    try {
      browser = await puppeteer.launch({ devtools: this.props.devtools ?? false });
      const page = await browser.newPage();
      await page.goto(this.props.kingOfTimeUrl);
      const cookieUrl = new URL(page.url());
      await page.browserContext().setCookie({
        name: this.props.tokenKey,
        value: this.props.token,
        domain: cookieUrl.hostname,
        path: "/",
        secure: cookieUrl.protocol === "https:",
      });
      await page.goto(this.props.kingOfTimeUrl);
      const targetDom = this.#getTarget(action);
      await page.waitForSelector(targetDom);
      await page.click(targetDom);
      const userSelector = this.#getUserSelector();
      await page.waitForSelector(userSelector.name);
      await waitForTimeout(500);
      await page.click(userSelector.title);
      await page.waitForSelector(this.#selector.password.dialog);
      await waitForTimeout(500);
      await page.type(this.#selector.password.input, this.props.password, {
        delay: 100,
      });
      await waitForTimeout(500);
      if (this.props.dryRun ?? false) {
        return this.#success();
      }
      await page.evaluate(() => {
        const submitButton = document?.querySelector<HTMLButtonElement>("[type=submit]");
        submitButton?.click();
      });
      await waitForTimeout(1000);
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
