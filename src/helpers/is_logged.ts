import { Page } from "playwright";

export async function IsLogged(page: Page, loginSelector: string): Promise<boolean> {    
    try{
        await await page.waitForSelector(loginSelector, { state: "visible", timeout: 3000 })        
        return true;        
    }catch{        
        return false;        
    }
}