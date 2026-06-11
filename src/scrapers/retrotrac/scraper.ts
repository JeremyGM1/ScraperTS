import { Browser } from "playwright";
import { extractRetrotracProduct, getInventory } from "./inventory";
import { IProduct } from "../../types/product";
import { isLogged } from "../../helpers/is_logged";
import { isNotFound } from "../../helpers/is_not_found";
import { login } from "./auth";
import fs from "fs";

export async function run(
  browser: Browser, 
  userEmail: string, 
  userPassword: string, 
  refId: string
): Promise<IProduct[] | null> {
  const sessionPath = "sessions/retrotrac.json";
  const context = await browser.newContext({ storageState: fs.existsSync(sessionPath) ? sessionPath : undefined });
  const page = await context.newPage();

  try {
    await page.goto("https://tiendab2b.retrotrac.com/");
    
    if (await isLogged(page, "a.item__link[href='#!/login']")) {
      await login(page, userEmail, userPassword);
      await context.storageState({ path: sessionPath });
    }

    await page.waitForSelector("#globalSearchTextHome:not([disabled])", { state: "visible" });
    await page.fill("#globalSearchTextHome", refId);

    await Promise.all([
      page.waitForURL(`**/${refId}**`, {timeout: 1000}),
      page.click("button.header__form__btn:not([disabled])")
    ])    

    await page.waitForLoadState("networkidle");

    if (await isNotFound(page, "div.col-md-12.mb20 h4", "No se encontraron")) return [];

    await page.waitForSelector(".box-product", { state: "visible" });
    const products = await page.$$(".box-product");    

    const results: IProduct[] = [];
    for (const product of products) {
      const item = await extractRetrotracProduct(product);
      if (item) results.push(item);      
    }

    await page.waitForTimeout(5000);

    return results;
  } catch (e) {
    console.error(`[Retrotrac] Unexpected error: ${e}`);
    return [];
  } finally {
    await context.close();
  }
}