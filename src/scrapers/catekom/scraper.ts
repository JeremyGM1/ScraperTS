import { Browser } from "playwright";
import { config } from "./config";
import { ICatekomProduct } from "../../types/catekom_product";
import { isLoginPageVisible } from "../../helpers/is_logged";
import { login } from "./auth";
import fs from "fs";

interface IGetPageResponse {
  d: {
    Fields: { Name: string }[];
    Rows: unknown[][];
    TotalRowCount: number;
  };
}

export async function run(
  browser: Browser,
  username: string,
  password: string,
  refId: string
): Promise<ICatekomProduct[] | null> {
  const sessionPath = "sessions/catekom.json";
  const context = await browser.newContext({ storageState: fs.existsSync(sessionPath) ? sessionPath : undefined });
  const page = await context.newPage();

  try {
    await page.goto(config.baseURL);

    if (await isLoginPageVisible(page, "div.Title:has-text('Login')")) {
      await login(page, username, password);
      await context.storageState({ path: sessionPath });
    }

    await page.goto(config.searchURL);

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/DAF/Service.asmx/GetPage") &&
        response.request().method() === "POST"
    );

    await page.fill("input#ctl00_PageContentPlaceHolder_view1Extender_QuickFind", refId);
    await page.click("a[onclick*='quickFind']");

    const response = await responsePromise;

    if (!response.ok()) {
      console.error(`[Catekom] GetPage request failed: ${response.status()}`);
      return null;
    }

    const json: IGetPageResponse = await response.json();

    if (json.d.TotalRowCount === 0) {
      return [];
    }

    const fieldNames = json.d.Fields.map((f) => f.Name);

    const results: ICatekomProduct[] = json.d.Rows.map((row) => {
      const record = Object.fromEntries(fieldNames.map((name, i) => [name, row[i]]));
      return {
        Referencia: String(record.Cod_Producto ?? ""),
        Nombre: String(record.Descripcion ?? ""),
        Marca: String(record.Proveedor_Producto ?? ""),
        Precio: String(record.ventas_minimo ?? ""),
        Inventario: Number(record.Cantidad ?? 0),
        Bodega: String(record.Cod_Emp ?? ""),
      };
    });

    return results;
  } catch (e) {
    console.error(`[Catekom] Error fetching product data: ${e}`);
    return null;
  } finally {
    await context.close();
  }
}