import { Browser } from "playwright";
import { extractReference } from "./extract_reference";
import { getInventory } from "./inventory";
import { IProduct } from "../../types/product";
import { isLogged } from "../../helpers/is_logged";
import { isNotFound } from "../../helpers/is_not_found";
import { login } from "./auth";
import fs from "fs";

export async function run(browser: Browser, userEmail: string, userPassword: string, refId: string): Promise<IProduct[] | null> {
  const sessionPath = "sessions/parteequipos.json";
  const context = await browser.newContext({ storageState: fs.existsSync(sessionPath) ? sessionPath : undefined });
  const page = await context.newPage();

  try {
    await page.goto("https://tienda.partequipos.com/");

    if (await isLogged(page, "a.customer-login-link")) {
          console.log("[Parte Equipos] Not logged in, performing login...");
          await login(page, userEmail, userPassword);
          await context.storageState({ path: sessionPath });      
        }else{
          console.log("[Parte Equipos] Already logged in, skipping login.");      
        }

    await page.goto(`https://tienda.partequipos.com/catalogsearch/result/?q=${refId}`);          

    if (await isNotFound(page, "div.message.notice", "La búsqueda no ha devuelto ningún resultado.")) {
      console.log(`[Parte Equipos] Product ${refId} not found`);
      return null;      
    }

    await page.waitForSelector("ol.product-items");    
    
    const products = page.locator("ol.product-items > li.product-item");

    const count = await products.count();

    console.log(`[Parte Equipos] Found ${count} products`);

    const results: IProduct[] = [];

    for (let i = 0; i < count; i++) {
      const product = products.nth(i);

      try {
        const name = await product.locator("a.product-item-link").innerText();
        
        let reference = "N/A";
        reference = await extractReference(name);

        const brandLocator = product.locator("p.star-container__title");

        const brand = (await brandLocator.count()) > 0 ? (await brandLocator.innerText()).trim() : "N/A";

        let price = "N/A";

        const priceLocator = product.locator("span.price-wrapper span.price");
        
        if (await priceLocator.count() > 0)
          price = (await priceLocator.first().innerText()).replace("$", "").trim();

        const cookieButton = page.locator("#btn-cookie-allow");

        if (await cookieButton.isVisible().catch(() => false))
          await cookieButton.click();

        const inventory = await getInventory(page, i);
        
        results.push({ Referencia: reference, Nombre: name, Marca: brand, Precio: price.replace("$", ""), Inventario: inventory });

      } catch (err) {
        console.error(`[Parte Equipos] Error extracting product: ${i}:`,
          err
        );
      }
    }

    return results;
  } catch (err) {
    console.error(`[Parte Equipos] Unexpected error: ${err}`);
    return null;
  }
}