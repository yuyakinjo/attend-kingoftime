import puppeteer from "puppeteer";
import { password, tokenKey, tokenValue, kingOfTimeurl, userName } from "./config";
import { Action } from "./timestamp";

// const [, , actionArg = "leave"] = process.argv;
interface Output {
  isSuccess: boolean;
  isFailed: boolean;
  isProcessing: boolean;
  error: unknown;
}

export const punch = async (actionArg: Action, dryRun = true): Promise<Output> => {
  const waitForTimeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const browser = await puppeteer.launch({ devtools: false });

  try {
    const page = await browser.newPage();
    await page.goto(kingOfTimeurl);
    await page.setCookie({ name: tokenKey, value: tokenValue });
    await page.goto(kingOfTimeurl);
    const action = actionArg === "attend" ? "#attend" : "#leave";
    await page.waitForSelector(action);
    await page.click(action);
    await page.waitForSelector(`[value*='${userName}']`);
    await waitForTimeout(500);
    await page.click(`[title*='${userName}']`);
    await page.waitForSelector("#password_dialog");
    await waitForTimeout(500);
    await page.type(".input_password", password, { delay: 100 });
    await waitForTimeout(500);
    if (dryRun) {
      await browser.close();
      return { isSuccess: true, isFailed: false, isProcessing: false, error: "" };
    }
    await page.evaluate(() => {
      const submitButton = document?.querySelector<HTMLButtonElement>("[type=submit]");
      submitButton?.click(); // input を入力する前に押しているようなので、evaluate 処理
    });
    await waitForTimeout(1000);
    await browser.close();
    return { isSuccess: true, isFailed: false, isProcessing: false, error: "" };
  } catch (error) {
    await browser.close();
    return { isSuccess: false, isFailed: true, isProcessing: false, error };
  }
};
