import {  BrowserContext } from "playwright";
import { config } from "./config";
import { config as envConfig } from "../../helpers/env";
import { FastifyBaseLogger } from "fastify";
import { Page } from "playwright";
import * as cheerio from "cheerio";

async function searchProduct(context: BrowserContext, refId: string, log: FastifyBaseLogger) {
  const tokenResponse = await context.request.post(config.URLgraphQL, {
    data: {
      query: `
        mutation {
          generateCustomerToken(email: "${envConfig.parteequipos.email}", password: "${envConfig.parteequipos.password}") {
            token
          }
        }
      `
    }
  });
  const tokenJson = await tokenResponse.json();
  const token = tokenJson.data?.generateCustomerToken?.token;

  return await context.request.post(
    config.URLgraphQL,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        query: `
        {
        products(search: "${refId}") 
          {
            items {
              id
              sku
              name
              url_key
              stock_status
              price_range {
                minimum_price {
                  regular_price {
                    value
                  }
                  final_price {
                    value
                  }
                }
              }
            }
          }
        }
        `
      }
    }
  );
}

async function getInventory(context: import("playwright").BrowserContext, id: number): Promise<{ total: number; monterrey: number }> {
  const inventoryUrl = `${config.inventoryURL}/${id}`;

  const response = await context.request.post(
    inventoryUrl,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
      },
      data: `sku=${id}`,
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

async function getSearchPage(context: BrowserContext, refId: string) {
  const url = `${config.searchURL}${encodeURIComponent(refId)}`;
  return await context.request.get(url);
}

async function getPriceFromPage(page: Page, refId: string, itemId: number): Promise<string | null> {
  await page.goto(
    `${config.searchURL}${refId}`,
    { waitUntil: "networkidle" }
  );

  const selector = `#product-price-${itemId}`;
  const el = await page.$(selector);
  if (!el) return null;

  return await el.getAttribute("data-price-amount");
}

async function getDiscountedPrice(context: BrowserContext, refId: string, itemId: string): Promise<string | null>{
  const url = `${config.searchURL}${refId}`;
  const response = await context.request.get(url);
  const html = await response.text();

  const $ = cheerio.load(html);
  const price = $(`#product-price-${itemId}`).attr("data-price-amount");
  return price ?? null;
}

export  { searchProduct, getInventory, getSearchPage, getPriceFromPage, getDiscountedPrice };