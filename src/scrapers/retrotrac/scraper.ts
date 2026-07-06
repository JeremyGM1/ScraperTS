import { Browser } from "playwright";
import { getInventory, searchProduct } from "./inventory";
import { IProduct } from "../../types/product";
import { performLogin } from "./auth";
import { config } from "./config";
import fs from "fs";

export async function run(
  browser: Browser, 
  userEmail: string, 
  userPassword: string, 
  refId: string
): Promise<IProduct[] | null> {
  const sessionPath = config.sessionPath;
  const context = await browser.newContext({ storageState: fs.existsSync(sessionPath) ? sessionPath : undefined });

  try {
    let response = await searchProduct(context, refId);
    
    if (!response) {
      await performLogin(context, sessionPath, userEmail, userPassword);
      response = await searchProduct(context, refId);
    }

    if (response && (response.status() === 401 || response.status() === 403)) {
      await performLogin(context, sessionPath, userEmail, userPassword);
      response = await searchProduct(context, refId);
    }

    if (!response)
      return [];

    const json = await response.json();       
    const result = getInventory(json.items ?? []);    
    return result;
  } catch (e) {
    console.error(`[Retrotrac] Unexpected error: ${e}`);
    return [];
  } finally {
    await context.close();
  }
}