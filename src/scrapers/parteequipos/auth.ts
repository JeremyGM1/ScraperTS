import { Browser, Page } from "playwright";

export async function login(page: Page, email: string, password: string){
    await page.click("a.customer-login-link");
    await page.waitForSelector("#email-login");
    await page.fill("input#email-login", email);
    await page.fill("input#pass-login", password);
    await page.click("#send2-login");
    await page.waitForSelector("a.customer-login-link", { state: "hidden" });
}