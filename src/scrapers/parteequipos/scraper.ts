import { Browser, Page } from "playwright";
import { config } from "./config";
import { FastifyBaseLogger } from "fastify";
import { IParteequiposProduct } from "../../types/parteequipos_product";
import { performLogin, isSessionValid } from "./auth";
import { searchProduct, getInventory, getDiscountedPrice } from "./inventory";
import fs from "fs";

export async function run(
  browser: Browser,
  userEmail: string,
  userPassword: string,
  refId: string,
  log: FastifyBaseLogger
): Promise<IParteequiposProduct[] | null> {
  const sessionPath = config.sessionPath;
  const context = await browser.newContext({
    storageState: fs.existsSync(sessionPath) ? sessionPath : undefined,
  });
 
  const page = await context.newPage();

  try {
    const sessionValid = fs.existsSync(sessionPath)
    ? await isSessionValid(page, log)
    : false;

    if (!sessionValid) {
      await performLogin(page, sessionPath, userEmail, userPassword, log);
    }

    const graphResponse = await searchProduct(context, refId, log);

    await page.goto(
      `${config.searchURL}${refId}`,
      { waitUntil: "networkidle" }
    );

    const graphJson = await graphResponse.json();
    const items: any[] = graphJson.data?.products?.items ?? [];

    if (!items.length) return [];

    const results: IParteequiposProduct[] = await Promise.all(
      items.map(async (item: any) => {
        const price = await getDiscountedPrice(context, refId, item.id);
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
    log.error({ scraper: "Parte Equipos", refId, err: err})
    return [];
  } finally {
    await page?.close();
    await context.close();
  }
}