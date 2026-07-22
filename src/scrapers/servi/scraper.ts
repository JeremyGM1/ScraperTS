import { Browser } from "playwright";
import { config } from "./config";
import { FastifyBaseLogger } from "fastify";
import { getInternalId, fetchResults } from "./inventory";
import { IProduct } from "../../types/product";
import { ensureLoggedIn } from "./auth";
import { mapServiItemsToProducts, ServiApiResponse } from "./mapper";
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

  try {
    await ensureLoggedIn(context, sessionPath, userEmail, userPassword);

    const internalId = await getInternalId(context, refId);
    if (!internalId) {
      log.warn({ scraper: "Servitractor", refId }, "Could not retrieve internal ID for reference");
      return [];
    }

    const data = await fetchResults(context, internalId);
    const items = data.MODEL?.DATAJSONARRAY ?? [];

    if(!items.length) {
      log.warn({ scraper: "Servitractor", refId }, "Product not found");
      return [];
    }

    const results = mapServiItemsToProducts(items);

    log.info({ scraper: "Servitractor", refId, count: results.length }, "Scrape completed");
    return results;
  } catch (e) {
    log.error({ scraper: "Servitractor", refId, err: e });
    return null;
  } finally {
    await context.close();
  }
}