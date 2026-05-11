
import { Browser } from "playwright";
import { getText } from "../../helpers/get_element";

interface Product {
  Referencia: string;
  Cantidad: string;
  Nombre: string;
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
    await page.goto("https://tiendab2b.retrotrac.com/");
    await page.click("a[ui-sref='home.login']");
    await page.fill("input#email", userEmail);
    await page.fill("input#password", userPassword);
    await page.click("button[type='submit']");
    await page.waitForLoadState("networkidle");

    await page.waitForSelector("#globalSearchTextHome:not([disabled])", { state: "visible" });
    await page.fill("#globalSearchTextHome", refId);

    await Promise.all([
      page.waitForURL(`**/${refId}**`, {timeout: 1000}),
      page.click("button.header__form__btn:not([disabled])")
    ])    
    await page.waitForLoadState("networkidle");  

    const notFound = await page.$("div.col-md-12.mb20 h4");
    if (notFound && (await notFound.innerText()).includes("No se encontraron")) {
      console.log(`[Retrotrac] Product ${refId} not found`);
      return null;
    }

    await page.waitForSelector(".box-product", { state: "visible" });
    const products = await page.$$(".box-product");
    console.log(`[Retrotrac] Found ${products.length} products`);

    const results: Product[] = [];
    for (const product of products) {
      try {
        const reference = (await getText(product, "h6.box-product__name a")).replace("Ref: ", "").trim();
        const quantityDiv = await getText(product, "div.box-product__name.color-base");
        const quantity = quantityDiv.split(": ")[1].trim();
        const name = (await getText(product, "div.box-product__reference")).trim();
        const price = (await getText(product, "div.box-product__price-normal")).replace("$", "").trim();

        results.push({ Referencia: reference, Cantidad: quantity, Nombre: name, Precio: price });
      } catch (e) {
        console.error(`[Retrotrac] Error extracting product: ${e}`);
      }
    }    

    await page.waitForTimeout(5000);

    return results;
  } catch (e) {
    console.error(`[Retrotrac] Unexpected error: ${e}`);
    return null;
  } finally {
    await context.close();
  }
}