import { BrowserContext, FrameLocator } from "playwright";
import { config } from "./config";
import fs from "fs";

export async function login(locator: FrameLocator, email: string, password: string): Promise<void> {    
    await locator.locator("#login_id").fill(email);
    await locator.locator("#nextbtn").click();

    await locator.locator("input#password").waitFor({ state: "visible" });
    await locator.locator("input#password").fill(password);
    await locator.locator("#nextbtn").click();
}

export async function isSessionValid(context: BrowserContext): Promise<boolean> {
    const page = await context.newPage();
    try {
        await page.goto(config.baseURL, {
            waitUntil: "networkidle",
        });
        const isLoginVisible = await page.isVisible("iframe[src*='accounts']");
        return !isLoginVisible;
    }catch(e){
        console.error(`[Servi] Error checking session validity: ${e}`);
        return false;
    }finally{
        await page.close();
    }
}

export async function ensureLoggedIn(context: BrowserContext, sessionPath: string, email: string, password: string): Promise<void> {
    if (fs.existsSync(sessionPath) && (await isSessionValid(context))) return;
    const page = await context.newPage();

    try {
        await page.goto(config.baseURL);
        await page.waitForLoadState("networkidle");
        const loginIframeHandle = page.frameLocator("iframe[src*='accounts']");
        await login(loginIframeHandle, email, password);
        await page.waitForURL("**/#Page:Inicio**");
        await context.storageState({ path: sessionPath });
    }finally{
        await page.close();
    }
}