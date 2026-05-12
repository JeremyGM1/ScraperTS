
import { Browser } from "playwright";
import { getText } from "../../helpers/get_element";
import { login } from "./auth";

interface Product {
  Nombre: string;
  Marca: string;
  Precio: string;
  Inventario?: number;
}

export async function run(browser: Browser, userEmail: string, userPassword: string, refId: string): Promise<Product[] | null> {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://tienda.partequipos.com/");

    await login(page, userEmail, userPassword);

    await page.goto(`https://tienda.partequipos.com/catalogsearch/result/?q=${refId}`);    

    await page.waitForSelector("ol.product-items");

    const notFound = page.locator("div.message.notice");
    if (await notFound.count() > 0 && (await notFound.innerText()).includes("no ha devuelto ningún resultado")) {
      console.log(`[Parte Equipos] Product ${refId} not found`);
      return null;
    }
    
    const products = page.locator("ol.product-items > li.product-item");

    const count = await products.count();

    console.log(`[Parte Equipos] Found ${count} products`);

    const results: Product[] = [];

    for (let i = 0; i < count; i++) {
      const product = products.nth(i);

      try {
        const name = await product.locator("a.product-item-link").innerText();

        const brandLocator = product.locator(
          "p.star-container__title"
        );

        const brand = (await brandLocator.count()) > 0 ? (await brandLocator.innerText()).trim() : "N/A";

        let price = "N/A";

        const priceLocator = product.locator("span.price-wrapper span.price");
        
        if (await priceLocator.count() > 0) {
          price = (await priceLocator.first().innerText()).replace("$", "").trim();          
        };

        const cookieButton = page.locator("#btn-cookie-allow");

        if (await cookieButton.isVisible().catch(() => false)) {
          await cookieButton.click();
        }

        let inventory = 0;

      const inventoryButton = product.locator("a.btn-show-inventory");

      if (await inventoryButton.count() > 0) {

        // Unique product SKU
        const sku = await inventoryButton.getAttribute("data-sku");

        await inventoryButton.click();

        // Active modal
        const modal = page.locator(
          ".modal-popup._show .inventory-popup-content"
        );

        await modal.waitFor({ state: "visible" });

        // IMPORTANT:
        // wait for modal content to refresh
        await page.waitForTimeout(1000);

        const quantities = await modal
          .locator(".row-per-office-popup .label-qty")
          .allTextContents();

        inventory = quantities.reduce((sum, value) => {
          return sum + (parseInt(value.trim()) || 0);
        }, 0);

        console.log(
          `[Parte Equipos] SKU ${sku} inventory: ${inventory}`
        );


        const closeButton = page.locator(
          ".modal-popup._show button.action-close[data-role='closeBtn']"
        );

        if (await closeButton.isVisible().catch(() => false)) {
          await closeButton.click();

          await page.waitForTimeout(500);
        }
      }
        
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