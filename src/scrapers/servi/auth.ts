import { Page } from "playwright";

export async function login(page: Page, email: string, password: string): Promise<void> {
    const loginFrame = page.frameLocator("iframe[src*='accounts']");
    await loginFrame.locator("#login_id").fill(email);
    await loginFrame.locator("#nextbtn").click();

    await loginFrame.locator("input#password").waitFor({ state: "visible" });
    await loginFrame.locator("input#password").fill(password);
    await loginFrame.locator("#nextbtn").click();
}