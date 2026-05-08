
import { Browser } from "playwright";
import { getText } from "../../helpers/get_element";

interface Product {
  Nombre: string;
  Marca: string;
  Precio: string;
}

export async function run(
  browser: Browser,
  userEmail: string,
  userPassword: string,
  refId: string
): Promise<Product[] | null> {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://tienda.partequipos.com/");
    await page.click("a.customer-login-link");
    await page.waitForSelector("#email-login");
    await page.fill("input#email-login", userEmail);
    await page.fill("input#pass-login", userPassword);
    await page.click("#send2-login");
    await page.waitForLoadState("networkidle");

    await page.goto(`https://tienda.partequipos.com/catalogsearch/result/?q=${refId}`);
    await page.waitForLoadState("networkidle");

    const notFound = await page.$("div.message.notice");
    if (notFound && (await notFound.innerText()).includes("no ha devuelto ningún resultado")) {
      console.log(`[Parte Equipos] Product ${refId} not found`);
      return null;
    }

    await page.waitForSelector("li.product-item", { state: "visible" });
    const products = await page.$$("li.product-item");
    console.log(`[Parte Equipos] Found ${products.length} products`);

    const results: Product[] = [];
    for (const product of products) {
      try {
        const name = (await getText(product, "a.product-item-link")).trim();
        const brand = (await getText(product, "p.star-container__title")).trim();
        const priceEl = await product.$("span.price-wrapper span.price");
        const price = priceEl ? (await priceEl.innerText()).replace("$", "").trim() : "N/A";

        results.push({ Nombre: name, Marca: brand, Precio: price });
      } catch (e) {
        console.error(`[Parte Equipos] Error extracting product: ${e}`);
      }
    }

    return results;
  } catch (e) {
    console.error(`[Parte Equipos] Unexpected error: ${e}`);
    return null;
  } finally {
    await context.close();
  }
}