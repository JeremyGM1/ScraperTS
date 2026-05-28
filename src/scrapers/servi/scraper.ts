import { Browser } from "playwright";
import { isNotFoundIframe } from "./is_not_found_iframe";
import { login } from "./auth";
import fs from "fs";

interface Product {
  Referencia: string;
  Nombre: string;
  Existencias: string;
  Precio: string;
}

export async function run(
  browser: Browser,
  userEmail: string,
  userPassword: string,
  refId: string
): Promise<Product[] | null> {
  const sessionPath = "sessions/servitractor.json";
  const context = await browser.newContext({ storageState: fs.existsSync(sessionPath) ? sessionPath : undefined });    
  const page = await context.newPage();

  try {
    await page.goto("https://empresaservitractor.zohocreatorportal.com/");
    await page.waitForLoadState("networkidle");

    const loginIframeHandle = await page.$("iframe[src*='accounts']");

    if (loginIframeHandle) {
      console.log("[Servitractor] Not logged in, performing login...");
      const loginFrame = page.frameLocator("iframe[src*='accounts']");
      await login(loginFrame, userEmail, userPassword);
      await context.storageState({ path: sessionPath });
    }else{
      console.log("[Servitractor] Already logged in, skipping login.");
    }

    await page.waitForURL("**/#Page:Inicio**");

    await page.fill("#zc-Busqueda", refId);
    await page.locator("input[name='Buscar']").click();
    
    const appFrame = page.frameLocator("iframe[src*='app']");
    if (await isNotFoundIframe(appFrame, "span[value='Sin resultados, refina la búsqueda']", "Sin resultados, refina la búsqueda")) {
      console.log(`[Servitractor] Product ${refId} not found`);
      return null;
    }else{
      console.log('product found');
    }

    await page.waitForSelector("table.htCore tbody tr", { state: "visible" });

    const rows = await page.locator("table.htCore tbody tr").all();

    const results: Product[] = [];
    for (const row of rows) {
      const cells = await row.locator("td").all();
      if (cells.length < 7) continue;

      results.push({
        Referencia:  (await cells[3].innerText()).trim(),
        Nombre:      (await cells[4].innerText()).trim(),
        Existencias: (await cells[5].innerText()).trim(),
        Precio:      (await cells[6].innerText()).trim(),
      });
    }

    return results;
  } catch (e) {
    console.error(`[Servi] Unexpected error: ${e}`);
    return null;
  } finally {
    await context.close();
  }
}