
import { Browser } from "playwright";
import { getInventory } from "./inventory";
import { login } from "./auth";
import { IProduct } from "../../types/product";

export async function run(browser: Browser, userEmail: string, userPassword: string, refId: string): Promise<IProduct[] | null> {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://tienda.partequipos.com/");

    await login(page, userEmail, userPassword);

    await page.goto(`https://tienda.partequipos.com/catalogsearch/result/?q=${refId}`);    
        
    const notFound = page.locator("div.message.notice");
    if (await notFound.isVisible().catch(() => false) && (await notFound.innerText()).includes("La búsqueda no ha devuelto ningún resultado.")) {
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
        
        results.push({ Nombre: name, Marca: brand, Precio: price.replace("$", ""), Inventario: inventory });

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