import { Browser, Page } from "playwright";
import { searchProduct, getPriceFromPage, getInventory } from "./inventory";
import { IParteequiposProduct } from "../../types/parteequipos_product";
import { performLogin } from "./auth";
import { config } from "./config";
import fs from "fs";

async function isSessionValid(context: import("playwright").BrowserContext): Promise<boolean> {
  const page = await context.newPage();
  try {
    await page.goto(config.baseURL, {
      waitUntil: "networkidle",
    });

    const isLoginVisible = await page.isVisible("a.customer-login-link");
    return !isLoginVisible;
  } catch (err) {
    console.error("[Parte Equipos] Session validation failed:", err);
    return false;
  } finally {
    await page.close();
  }
}

export async function run(
  browser: Browser,
  userEmail: string,
  userPassword: string,
  refId: string
): Promise<IParteequiposProduct[] | null> {
  const sessionPath = config.sessionPath;
  const context = await browser.newContext({
    storageState: fs.existsSync(sessionPath) ? sessionPath : undefined,
  });

  let page: Page | null = null;

  try {
    if (!fs.existsSync(sessionPath) || !(await isSessionValid(context))) {
      await performLogin(context, sessionPath, userEmail, userPassword);
    }

    const graphResponse = await searchProduct(context, refId);
    const graphJson = await graphResponse.json();
    const items: any[] = graphJson.data?.products?.items ?? [];

    if (!items.length) return [];

    page = await context.newPage();

    await page.goto(
      `${config.searchURL}?q=${refId}`,
      { waitUntil: "networkidle" }
    );

    const results: IParteequiposProduct[] = await Promise.all(
      items.map(async (item: any) => {
        const selector = `#product-price-${item.id}`;
        const price = await page!.$eval(selector, el => el.getAttribute("data-price-amount")).catch(() => null);

        const inventory = await getInventory(context, item.id);

        const rawSku: string = (item.sku || "").trim();
        const skuParts = rawSku.split("-");
        const referencia = skuParts[0] || rawSku;

        let marca = skuParts.slice(1).join("-") || "";
        if (marca.startsWith("A") && marca.length > 1) {
          marca = marca.slice(1);
        }

        const rawName: string = (item.name || "").trim();
        const nombre = rawName.replace(/\s+\d+$/u, "").trim();

        return {
          Referencia: referencia,
          Nombre: nombre,
          Marca: marca,
          Precio: price ?? "0",
          Inventario: inventory.total,
          Monterrey: inventory.monterrey,
        };
      })
    );

    return results;
  } catch (err) {
    console.error(`[Parte Equipos] Unexpected error:`, err);
    return [];
  } finally {
    await page?.close();
    await context.close();
  }
}