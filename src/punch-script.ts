import puppeteer from "puppeteer";
import { Action, ValueOf } from "./types/types";
import { LocalStorage } from "@raycast/api";
import { ConfigFormValue } from "./components/ConfigForms";

interface Props extends ConfigFormValue {
  dryRun?: boolean;
  devtools?: boolean;
}

export class KingOfTime {
  static Punch = {
    Attend: "attend",
    Leave: "leave",
  } as const;

  static GetConfigFrom = async (localStroage: typeof LocalStorage): Promise<ConfigFormValue> => {
    const items = await localStroage.allItems();
    return {
      username: items.username,
      password: items.password,
      kingOfTimeUrl: items.kingOfTimeUrl,
      token: items.token,
      tokenKey: items.tokenKey,
    };
  };

  public output = { isSuccess: false, isFailed: false, isProcessing: false, error: "" };

  #selector = {
    submitButton: `[type=submit]`,
    password: {
      dialog: `#password_dialog`,
      input: `.input_password`,
    },
    action: {
      attend: `#attend`,
      leave: `#leave`,
    },
    user: {
      name: `[value*='${this.props.username}']`,
      title: `[title*='${this.props.username}']`,
    },
  };

  constructor(private props: Props) {}

  #start = () => ({ ...this.output, isProcessing: true });

  #success = () => ({ ...this.output, isSuccess: true, isProcessing: false });

  #failed = (error: unknown) => ({ isSuccess: false, isFailed: true, isProcessing: false, error });

  #getTarget(action: ValueOf<Action> = KingOfTime.Punch.Attend) {
    const isAttend = action === KingOfTime.Punch.Attend;
    return isAttend ? this.#selector.action.attend : this.#selector.action.leave;
  }

  async punch(action?: ValueOf<Action>) {
    const waitForTimeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    this.output = this.#start();
    const browser = await puppeteer.launch({ devtools: this.props.devtools ?? false });
    try {
      const page = await browser.newPage();
      await page.goto(this.props.kingOfTimeUrl);
      await page.setCookie({ name: this.props.tokenKey, value: this.props.token });
      await page.goto(this.props.kingOfTimeUrl);
      const actionDom = this.#getTarget(action);
      await page.waitForSelector(actionDom);
      await page.click(actionDom);
      await page.waitForSelector(this.#selector.user.name);
      await waitForTimeout(500);
      await page.click(this.#selector.user.title);
      await page.waitForSelector(this.#selector.password.dialog);
      await waitForTimeout(500);
      await page.type(this.#selector.password.input, this.props.password, { delay: 100 });
      await waitForTimeout(500);
      if (this.props.dryRun) {
        await browser.close();
        return { isSuccess: true, isFailed: false, isProcessing: false, error: "" };
      }
      await page.evaluate(() => {
        const submitButton = document?.querySelector<HTMLButtonElement>(this.#selector.submitButton);
        submitButton?.click();
      });
      await waitForTimeout(1000);
      await browser.close();
      return this.#success();
    } catch (error) {
      await browser.close();
      return this.#failed(error);
    }
  }
}
