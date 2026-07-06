import { APIResponse, BrowserContext } from "playwright";
import { Page } from "playwright";
import * as cheerio from "cheerio";

async function searchProduct(context: BrowserContext, refId: string){
  return await context.request.post(
    "https://tienda.partequipos.com/graphql",
    {
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
  const response = await context.request.post(
    `https://tienda.partequipos.com/getinventory/index/inventory/sku/${id}`,
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
  const url = `https://tienda.partequipos.com/catalogsearch/result/?q=${encodeURIComponent(refId)}`;
  return await context.request.get(url);
}

async function getPriceFromPage(page: Page, refId: string, itemId: number): Promise<string | null> {
  await page.goto(
    `https://tienda.partequipos.com/catalogsearch/result/?q=${refId}`,
    { waitUntil: "networkidle" }
  );

  const selector = `#product-price-${itemId}`;
  const el = await page.$(selector);
  if (!el) return null;

  return await el.getAttribute("data-price-amount");
}

export  { searchProduct, getInventory, getSearchPage, getPriceFromPage };