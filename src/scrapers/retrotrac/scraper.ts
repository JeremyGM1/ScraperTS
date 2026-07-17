import { Browser } from "playwright";
import { searchProduct } from "./inventory";
import { IProduct } from "../../types/product";
import { performLogin } from "./auth";
import { config } from "./config";
import { mapRetrotracItemsToProducts } from "./mappers"
import fs from "fs";
import { FastifyBaseLogger } from "fastify";

export async function run(
  browser: Browser, 
  userEmail: string, 
  userPassword: string, 
  refId: string,
  log: FastifyBaseLogger
): Promise<IProduct[] | null> {
  const sessionPath = config.sessionPath;
  const context = await browser.newContext({ storageState: fs.existsSync(sessionPath) ? sessionPath : undefined });

  try {
    const referenceToSearch = typeof refId === "string" ? refId.trim() : refId;

    let response = await searchProduct(context, referenceToSearch, log);
    
    if (!response) {
      await performLogin(context, sessionPath, userEmail, userPassword, log);
      response = await searchProduct(context, referenceToSearch, log);
    }

    if (response && (response.status() === 401 || response.status() === 403)) {
      await performLogin(context, sessionPath, userEmail, userPassword, log);
      response = await searchProduct(context, referenceToSearch, log);
    }

    if (!response) {
      log.warn({ scraper: "retrotrac", refId }, "No response received");
      return [];
    }

    const json = await response.json();
    const result = mapRetrotracItemsToProducts(json.items ?? []);

    log.info({ scraper: "retrotrac", refId, count: result.length }, "Scrape complete");
    return result;
  } catch (e) {
    log.error({ scraper: "retrotrac", refId, err: e }, "Unexpected error");
    return [];
  } finally {
    await context.close();
  }
}