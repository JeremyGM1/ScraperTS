import { Browser } from "playwright";
import { config } from "./config";
import { FastifyBaseLogger } from "fastify";
import { IProduct } from "../../types/product";
import { mapRetrotracItemsToProducts } from "./mappers"
import { performLogin } from "./auth";
import { searchProduct } from "./inventory";
import fs from "fs";

export async function run(
  browser: Browser, 
  userEmail: string, 
  userPassword: string, 
  refId: string,
  log: FastifyBaseLogger
): Promise<IProduct[] | null> {
  const sessionPath = config.sessionPath;
  const context = await browser.newContext({ storageState: fs.existsSync(sessionPath) ? sessionPath : undefined });

  const startTime = Date.now();
  try {
    const referenceToSearch = typeof refId === "string" ? refId.trim() : refId;

    let response;

    try {
      response = await searchProduct(context, referenceToSearch, log);
    } catch (e) {
      log.info({ scraper: "retrotrac", refId }, "Initial request failed, re-authenticating...");
      await performLogin(context, sessionPath, userEmail, userPassword, log);
      response = await searchProduct(context, referenceToSearch, log);
    }

    if (response && (response.status() === 401 || response.status() === 403)) {
      await performLogin(context, sessionPath, userEmail, userPassword, log);
      response = await searchProduct(context, referenceToSearch, log);
    }

    const json = await response.json();
    const result = mapRetrotracItemsToProducts(json.items ?? []);

    log.info({ scraper: "retrotrac", refId, count: result.length, responseTime: Date.now() - startTime }, "Scrape complete");
    return result;
  } catch (e) {
    log.error({ scraper: "retrotrac", refId, err: e, responseTime: Date.now() - startTime }, "Unexpected error");
    throw e instanceof Error ? e : new Error(String(e));
  } finally {
    await context.close();
  }
}