import { Browser } from "playwright";
import { config } from "./config";
import { ensureSession } from "./auth";
import { FastifyBaseLogger } from "fastify";
import { IAgrocostaProduct } from "../../types/agrocosta_product";
import { isNotFoundHtml, parseProducts, queryViaHttp } from "./inventory";
import fs from "fs";

export async function run(
    browser: Browser,
    username: string,
    password: string,
    refId: string,
    log: FastifyBaseLogger
): Promise<IAgrocostaProduct[] | null> {
    const startTime = Date.now();
    try {
        if (!fs.existsSync(config.sessionPath))
            await ensureSession(browser, username, password, log);

        let { html, loggedOut } = await queryViaHttp(refId);

        if (loggedOut) {
            log.info({ scraper: "Agrocosta", refId }, "Session expired, re-authenticating via browser...");
            await ensureSession(browser, username, password, log);
            ({ html, loggedOut } = await queryViaHttp(refId));

            if (loggedOut) {
                log.error({ scraper: "Agrocosta", refId }, "Still not authenticated after re-login.")
                return null;
            }
        }

        if (isNotFoundHtml(html)) {
            log.info({ scraper: "Agrocosta", refId }, "Product not found.");
            return [];
        }

        const results = parseProducts(html);
        log.info({ scraper: "Agrocosta", refId, count: results.length, responseTime: startTime - Date.now() }, "Scrape complete");
        return results;
    } catch (e) {
        log.error({ scraper: "Agrocosta", refId, e, responseTime: startTime - Date.now() }, "Error extracting product");
        return null;
    }
}