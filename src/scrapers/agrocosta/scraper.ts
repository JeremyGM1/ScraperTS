import { Browser } from "playwright";
import { config } from "./config";
import { ensureSession } from "./auth";
import { IAgrocostaProduct } from "../../types/agrocosta_product";
import { isNotFoundHtml, parseProducts, queryViaHttp } from "./inventory";
import fs from "fs";

export async function run(
    browser: Browser,
    username: string,
    password: string,
    refId: string
): Promise<IAgrocostaProduct[] | null> {
    try {
        if (!fs.existsSync(config.sessionPath)) {
            await ensureSession(browser, username, password);
        }

        let { html, loggedOut } = await queryViaHttp(refId);

        if (loggedOut) {
            console.log("[Agrocosta] Session expired, re-authenticating via browser...");
            await ensureSession(browser, username, password);
            ({ html, loggedOut } = await queryViaHttp(refId));

            if (loggedOut) {
                console.error("[Agrocosta] Still not authenticated after re-login.");
                return null;
            }
        }

        if (isNotFoundHtml(html)) {
            console.log(`[Agrocosta] Product ${refId} not found`);
            return [];
        }

        return parseProducts(html);
    } catch (e) {
        console.error(`[Agrocosta] Error extracting product: ${e}`);
        return null;
    }
}