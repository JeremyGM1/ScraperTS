import { Browser, Page } from "playwright";
import { config } from "./config";
import { FastifyBaseLogger } from "fastify";
import { IParteequiposProduct } from "../../types/parteequipos_product";
import { performLogin, isSessionValid } from "./auth";
import { fetchSearchPage, getInventory, parseSearchResults } from "./inventory";
import fs, { writeFile } from "fs";

import path from "path";

export async function run(
  browser: Browser,
  userEmail: string,
  userPassword: string,
  refId: string,
  log: FastifyBaseLogger
): Promise<IParteequiposProduct[] | null> { 
  const sessionPath = config.sessionPath;
  const context = await browser.newContext({ storageState: fs.existsSync(sessionPath) ? sessionPath : undefined });
 
  const startTime = Date.now();
  try {
    const page = await context.newPage();  
    const sessionValid = fs.existsSync(sessionPath) ? await isSessionValid(page, log) : false;

    if (!sessionValid) {
      await performLogin(page, sessionPath, userEmail, userPassword, log);
    }

    const html = await fetchSearchPage(context, refId, log);
    const parsedResults = parseSearchResults(html, log);

    if(!parsedResults.length) {
      log.warn({ scraper: "Parte Equipos", refId }, "No products found.");
      return [];
    }
    
    const results: IParteequiposProduct[] = await Promise.all(
      parsedResults.map(async({ internalId, ...product }) => {
        const skuId = internalId;
        if (!skuId) {
          log.warn({ scraper: "Parte Equipos", referencia: product.Referencia }, "Invalid sku id, skipping inventory lookup.");
          return product;
        }

        try {
          const { total, monterrey } = await getInventory(context, skuId);
          return { ...product, Inventario: total, Monterrey: monterrey };
        }catch(err){
          log.warn({ scraper: "Parte Equipos", referencia: product.Referencia, err }, "Inventory lookup failed.");
          return product;
        }
      })
    );

    log.info({ scraper: "Parte Equipos", refId, count: results.length, responseTime: Date.now() - startTime }, "Scrape complete");
    return results;
  } catch (err) {
    log.error({ scraper: "Parte Equipos", refId, err: err, responseTime: Date.now() - startTime });
    return [];
  } finally {
    await context.close();
  }
}