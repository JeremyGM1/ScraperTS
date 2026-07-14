import { Browser } from "playwright";
import { config } from "./config";
import { getInternalId, fetchResults } from "./inventory";
import { IProduct } from "../../types/product";
import { login, ensureLoggedIn } from "./auth";
import { mapServiItemsToProducts, ServiApiResponse } from "./mapper";
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
    await ensureLoggedIn(context, sessionPath, userEmail, userPassword);

    const internalId = await getInternalId(context, refId);
    if (!internalId) {
      console.error("[Servitractor] Could not retrieve internal ID for reference:", refId);
      return [];
    }

    const data = await fetchResults(context, internalId);
    const items = data.MODEL?.DATAJSONARRAY ?? [];

    if(!items.length) {
      console.log(`[Servitractor] Product ${refId} not found`);
      return [];
    }

    return mapServiItemsToProducts(items);
  } catch (e) {
    console.error(`[Servi] Unexpected error: ${e}`);
    return null;
  } finally {
    await context.close();
  }
}