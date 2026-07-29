import {  BrowserContext } from "playwright";
import { config } from "./config";
import { FastifyBaseLogger } from "fastify";
import { IParsedProduct } from "../../types/parteequipos_product";
import * as cheerio from "cheerio";

export async function fetchSearchPage(context: BrowserContext, refId: string, log: FastifyBaseLogger): Promise<string> {
  const response = await context.request.get(
    `${config.searchURL}${refId}`,
    {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
      },
    }
  );
  
  if (!response.ok()) {
    log.warn({ scraper: "Parte Equipos", refId, status: response.status() }, "Search page fetch failed");
  }

  return await response.text();
}

export function parseSearchResults(html: string, log: FastifyBaseLogger): IParsedProduct[] {
  const $ = cheerio.load(html);
  const results: IParsedProduct[] = [];

  $("li.item.product.product-item").each((_, el) => {
    const $el = $(el) ;
    const $btn = $el.find("button[data-sku]").first();

    const rawSku = ($btn.attr("data-sku") || "").trim();
    if (!rawSku) {
      log.warn({ scraper: "Parte Equipos" }, "Product block missing data-sku, skipping");
      return;
    }

    const skuParts = rawSku.split("-");
    const referencia = skuParts[0] || rawSku;

    let marca = skuParts.slice(1).join("-") || "";
    if (marca.startsWith("A") && marca.length > 1) {
      marca = marca.slice(1);
    }
    const rawName = ($btn.attr("data-name") || $el.find(".product-item-link").first().text() || "").trim();
    const nombre = rawName.replace(/\s+\d+$/u, "").trim();

    const precio = $el.find("[data-price-type='finalPrice']").first().attr("data-price-amount") || "0";

    const internalId = ($el.find("#btn-show-inventory").attr("data-sku") || "").trim();
    if (!internalId) {
      log.warn({ scraper: "Parte Equipos", referencia }, "Missing internal inventory sku, inventory lookup skipped.");
    }

    results.push({
      Referencia: referencia,
      Nombre: nombre,
      Marca: marca,
      Precio: precio,
      Inventario: undefined,
      Monterrey: undefined,
      internalId
    });
  });
  return results;
}

export async function getInventory(context: import("playwright").BrowserContext, internalId: string): Promise<{ total: number; monterrey: number }> {
  const inventoryUrl = `${config.inventoryURL}/${internalId}`;

  const response = await context.request.post(
    inventoryUrl,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
      },
      data: `sku=${internalId}`,
    }
  );

  const json = await response.json().catch(() => null);
  if (!json?.content) return { total: 0, monterrey: 0 };

  const $ = cheerio.load(json.content);
  let total = 0;
  $(".label-qty-total").each((_, el) => {
    total += parseInt($(el).text().trim(), 10) || 0;
  });

  let monterrey = 0;
  $(".row-per-office-popup").each((_, el) => {
    const city = $(el).find(".label-city-popup").text().trim();
    if (city.toLowerCase() === "monterrey") {
      monterrey = parseInt($(el).find(".label-qty").text().trim(), 10) || 0;
    }
  });

  return { total, monterrey };
}