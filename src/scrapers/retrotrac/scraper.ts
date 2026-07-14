import { Browser } from "playwright";
import { searchProduct } from "./inventory";
import { IProduct } from "../../types/product";
import { performLogin } from "./auth";
import { config } from "./config";
import { mapRetrotracItemsToProducts } from "./mappers"
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
    const referenceToSearch = typeof refId === "string" ? refId.trim() : refId;

    console.log(`[Retrotrac] Incoming reference:`, JSON.stringify(refId));
    console.log(`[Retrotrac] Reference to search:`, JSON.stringify(referenceToSearch));

    let response = await searchProduct(context, referenceToSearch);
    
    if (!response) {
      await performLogin(context, sessionPath, userEmail, userPassword);
      response = await searchProduct(context, referenceToSearch);
    }

    if (response && (response.status() === 401 || response.status() === 403)) {
      await performLogin(context, sessionPath, userEmail, userPassword);
      response = await searchProduct(context, referenceToSearch);
    }

    if (!response)
      return [];

    const json = await response.json();

    console.log(refId, json);

    const result = mapRetrotracItemsToProducts(json.items ?? []);
    return result;
  } catch (e) {
    console.error(`[Retrotrac] Unexpected error: ${e}`);
    return [];
  } finally {
    await context.close();
  }
}