import { Page } from "playwright";

export async function isLoginPageVisible(page: Page, loginSelector: string): Promise<boolean> {
    try{
        await page.waitForSelector(loginSelector, { state: "visible", timeout: 3000 })
        return true;
    }catch{
        return false;
    }
}