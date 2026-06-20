import { Page } from "playwright";

export async function   login(page: Page, email: string, password: string){
    await page.click("a.item__link[href='#!/login']");
    await page.fill("input#email", email);
    await page.fill("input#password", password);
    await page.click("button[type='submit']");
    await page.waitForSelector("a.item__link[href='#!/login']", { state: "hidden" });
}