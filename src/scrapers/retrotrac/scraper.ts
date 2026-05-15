
import { Browser } from "playwright";
import { getText } from "../../helpers/get_element";
import { login } from "./auth";
import fs from "fs";
import { IsLogged } from "../../helpers/is_logged";
import { isNotFound } from "../../helpers/is_not_found";
import { IProduct } from "../../types/product";


export async function run(browser: Browser, userEmail: string, userPassword: string, refId: string): Promise<IProduct[] | null> {
  const sessionPath = "sessions/retrotrac.json";
  const context = await browser.newContext({ storageState: fs.existsSync(sessionPath) ? sessionPath : undefined });
  const page = await context.newPage();

  try {
    await page.goto("https://tiendab2b.retrotrac.com/");
    
    if (await IsLogged(page, "a.item__link[href='#!/login']")) {
      console.log("[Retrotrac] Not logged in, performing login...");
      await login(page, userEmail, userPassword);
      await context.storageState({ path: sessionPath });      
    }else{
      console.log("[Retrotrac] Already logged in, skipping login.");      
    }

    await page.waitForSelector("#globalSearchTextHome:not([disabled])", { state: "visible" });
    await page.fill("#globalSearchTextHome", refId);

    await Promise.all([
      page.waitForURL(`**/${refId}**`, {timeout: 1000}),
      page.click("button.header__form__btn:not([disabled])")
    ])    
    await page.waitForLoadState("networkidle");  

    if (await isNotFound(page, "div.col-md-12.mb20 h4", "No se encontraron")) {
      console.log(`[Retrotrac] Product ${refId} not found`);
      return null;      
    }

    await page.waitForSelector(".box-product", { state: "visible" });
    const products = await page.$$(".box-product");
    console.log(`[Retrotrac] Found ${products.length} products`);

    const results: IProduct[] = [];
    for (const product of products) {
      try {
        const reference = (await getText(product, "h6.box-product__name a")).replace("Ref: ", "").trim();
        const quantityDiv = await getText(product, "div.box-product__name.color-base");
        const quantity = quantityDiv.split(": ")[1].trim();
        const name = (await getText(product, "div.box-product__reference")).trim();
        const price = (await getText(product, "div.box-product__price-normal")).replace("$", "").trim();

        results.push({ Referencia: reference, Nombre: name, Marca: "", Precio: price, Inventario: parseInt(quantity) });
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