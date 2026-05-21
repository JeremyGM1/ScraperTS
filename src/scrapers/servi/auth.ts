import { FrameLocator, Page } from "playwright";

async function login(locator: FrameLocator, email: string, password: string): Promise<void> {    
    await locator.locator("#login_id").fill(email);
    await locator.locator("#nextbtn").click();

    await locator.locator("input#password").waitFor({ state: "visible" });
    await locator.locator("input#password").fill(password);
    await locator.locator("#nextbtn").click();
}

export { login };