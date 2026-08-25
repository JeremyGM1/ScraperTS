import { Browser } from "playwright";
import { config } from "./config";
import { ensureLoggedIn } from "./auth";
import { FastifyBaseLogger } from "fastify";
import { getInternalId, fetchResults } from "./inventory";
import { IProduct } from "../../types/product";
import { mapServiItemsToProducts } from "./mapper";
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
    await ensureLoggedIn(context, sessionPath, userEmail, userPassword);

    const internalId = await getInternalId(context, refId);
    if (!internalId) {
      log.warn({ scraper: "Servitractor", refId }, "Could not retrieve internal ID for reference");
      throw new Error("Could not retrieve internal ID for reference");
    }

    const data = await fetchResults(context, internalId);
    const items = data.MODEL?.DATAJSONARRAY ?? [];

    if(!items.length) {
      log.warn({ scraper: "Servitractor", refId }, "Product not found");
      return [];
    }

    const results = mapServiItemsToProducts(items);

    log.info({ scraper: "Servitractor", refId, count: results.length, responseTime: Date.now() - startTime }, "Scrape completed");
    return results;
  } catch (err) {
    log.error({ scraper: "Servitractor", refId, err: err, responseTime: Date.now() - startTime });
    throw err instanceof Error ? err : new Error(String(err));
  } finally {
    await context.close();
  }
}