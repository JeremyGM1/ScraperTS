import { Page } from "playwright";

export async function Login(page: Page, email: string, password: string){
    await page.click("a[ui-sref='home.login']");
    await page.fill("input#email", email);
    await page.fill("input#password", password);
    await page.click("button[type='submit']");
    await page.waitForLoadState("networkidle");
}