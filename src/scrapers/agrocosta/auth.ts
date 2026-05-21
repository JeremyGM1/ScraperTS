import { Page } from "playwright";

export async function login(page: Page, username: string, password: string): Promise<void>{
    try {
        await page.fill("input[name='usuario']", username);
        await page.fill("input[name='contraseña']", password);
        await page.click("button[type='submit']")
        await page.waitForLoadState("networkidle");        
    } catch (e) {
        console.error(`[Agrocosta][Login] Failed to complete login: ${e}`);
    }
}