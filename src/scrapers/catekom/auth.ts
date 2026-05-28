import { Page } from "playwright";

export async function login(page: Page, username: string, password: string): Promise<void> {
  await page.fill("input[name='ctl00$PageContentPlaceHolder$Login1$Login1$UserName']", username);
  await page.fill("input[name='ctl00$PageContentPlaceHolder$Login1$Login1$Password']", password);
  await page.click("input[name='ctl00$PageContentPlaceHolder$Login1$Login1$LoginButton']");
}