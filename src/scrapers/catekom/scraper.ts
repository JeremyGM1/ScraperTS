import { Browser } from "playwright";
import { ICatekomProduct } from "../../types/catekom_product";
import { isLoginPageVisible } from "../../helpers/is_logged";
import { isNotFound } from "../../helpers/is_not_found";
import { login } from "./auth";
import fs from "fs";

export async function run(
  browser: Browser,
  username: string,
  password: string,
  refId: string
  ): Promise<ICatekomProduct[] | null> {
    const sessionPath = "sessions/catekom.json";
    const context = await browser.newContext({ storageState: fs.existsSync(sessionPath) ? sessionPath : undefined });
    const page = await context.newPage();

    try{
      await page.goto("http://179.33.191.211:8090/");

      if (await isLoginPageVisible(page, "div.Title:has-text('Login')")) {
        await login(page, username, password);
        await context.storageState({path: sessionPath})
      }

      await page.goto("http://179.33.191.211:8090/Pages/CLIENTES.aspx");
      await page.fill("input#ctl00_PageContentPlaceHolder_view1Extender_QuickFind", refId);
      await page.click("a[onclick*='quickFind']");

      await page.waitForLoadState("networkidle");

      if (await isNotFound(page, "tr.Row.NoRecords td.Cell", "No se han encontrado.")) return [];
      
      const rows = await page.locator("[id^='ctl00_PageContentPlaceHolder_view1Extender_Row']").all();

      const results: ICatekomProduct[] = [];

      for (const row of rows) {
        const getCell = async (className: string) => {
          const cell = row.locator(`td.${className}`);
          if (await cell.count() === 0) return "";
          return (await cell.innerText()).trim();
        };

        results.push({
          Referencia: await getCell("Cod_Producto"),
          Nombre: await getCell("Descripcion"),
          Marca: await getCell("Proveedor_Producto"),
          Precio: await getCell("ventas_minimo"),
          Inventario: parseInt(await getCell("Cantidad")),
          Bodega: await getCell("Cod_Emp"),
        });
      }

      return results;
    }catch(e){
        console.error(`[Catekom] Error extracting product: ${e}`);
        return null;
    }finally{
        await context.close();
    }
}