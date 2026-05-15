import { Page } from "playwright";

export async function isNotFound(
    page: Page, 
    selector: string, 
    notFoundText: string
): Promise<boolean> {
    const element = await page.$(selector);
    if (!element) return false;

    const text = await element.innerText();
    return text.includes(notFoundText);
}