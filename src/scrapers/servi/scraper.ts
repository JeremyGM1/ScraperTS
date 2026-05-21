import { Browser } from "playwright";
import { login } from "./auth";
import { IsLogged } from "../../helpers/is_logged";
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

    if (await IsLogged(page, "#login_id")) {
      console.log("[Servitractor] Not logged in, performing login...");
      await login(page, userEmail, userPassword);
      await context.storageState({ path: sessionPath });      
    }else{
      console.log("[Servitractor] Already logged in, skipping login.");      
    }

    await login(page, userEmail, userPassword);

    await page.waitForURL("**/#Page:Inicio**");

    await page.fill("#zc-Busqueda", refId);
    await page.locator("input[name='Buscar']").click();

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