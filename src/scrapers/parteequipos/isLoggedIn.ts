import { Page } from "playwright";

export async function IsLoggedIn(page: Page): Promise<boolean> {    
    const IsLogginButtonVisible = await page
    .locator("a.customer-login-link")
    .first()
    .isVisible()
    .catch(() => false);
    return !IsLogginButtonVisible;
}