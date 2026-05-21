import { Page, FrameLocator } from "playwright";

export async function isNotFoundIframe(
    page: Page | FrameLocator, 
    selector: string, 
    notFoundText: string
): Promise<boolean> {
    try{
        const element = page.locator(selector);
        await element.waitFor({ state: "visible", timeout: 3000 });
        const text = await element.innerText();
        
        return text.includes(notFoundText);
    }catch{
        return false;
    }    
}