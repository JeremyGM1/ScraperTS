import fs from "fs";
import { Browser, Page } from "playwright";
import { isLoginPageVisible } from "../../helpers/is_logged";
import { config } from "./config";

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

export async function ensureSession(browser: Browser, username: string, password: string): Promise<void> {
    const context = await browser.newContext({
        storageState: fs.existsSync(config.sessionPath) ? config.sessionPath : undefined,
    });
    const page = await context.newPage();

    try {
        await page.goto(config.baseURL);

        if (await isLoginPageVisible(page, "div.card-header:has-text('Iniciar sesión')")) {
            console.log("[Agrocosta] Not logged in, performing login...");
            await login(page, username, password);
        } else {
            console.log("[Agrocosta] Already logged in, skipping login.");
        }

        await context.storageState({ path: config.sessionPath });
    } finally {
        await context.close();
    }
}