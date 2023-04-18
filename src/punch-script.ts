import puppeteer from "puppeteer";
import { Action } from "./timestamp";

interface Props {
  action: Action;
  username: string;
  password: string;
  kingOfTimeUrl: string;
  token: string;
  tokenKey: string;
}

export const punch = async ({ action, password, username, kingOfTimeUrl, token, tokenKey }: Props, dryRun = true) => {
  const waitForTimeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const browser = await puppeteer.launch({ devtools: false });
  try {
    const page = await browser.newPage();
    await page.goto(kingOfTimeUrl);
    await page.setCookie({ name: tokenKey, value: token });
    await page.goto(kingOfTimeUrl);
    const actionDom = action === Action.ATTEND ? "#attend" : "#leave";
    await page.waitForSelector(actionDom);
    await page.click(actionDom);
    await page.waitForSelector(`[value*='${username}']`);
    await waitForTimeout(500);
    await page.click(`[title*='${username}']`);
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
