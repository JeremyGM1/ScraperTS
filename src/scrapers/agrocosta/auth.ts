import { Browser, Page } from "playwright";
import { config } from "./config";
import { FastifyBaseLogger } from "fastify";
import { isLoginPageVisible } from "../../helpers/is_logged";
import fs from "fs";

export async function login(page: Page, username: string, password: string, log: FastifyBaseLogger): Promise<void>{
    try {
        await page.fill("input[name='usuario']", username);
        await page.fill("input[name='contraseña']", password);
        await page.click("button[type='submit']")
        await page.waitForLoadState("networkidle");
    } catch (e) {
        log.error({ scraper: "Agrocosta", e }, "Failed to complete login");
    }
}

export async function ensureSession(browser: Browser, username: string, password: string, log: FastifyBaseLogger): Promise<void> {
    const context = await browser.newContext({
        storageState: fs.existsSync(config.sessionPath) ? config.sessionPath : undefined,
    });
    const page = await context.newPage();

    try {
        await page.goto(config.baseURL);

        if (await isLoginPageVisible(page, "div.card-header:has-text('Iniciar sesión')"))
            await login(page, username, password, log);

        await context.storageState({ path: config.sessionPath });
    } finally {
        await context.close();
    }
}