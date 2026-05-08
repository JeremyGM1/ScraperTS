import { Browser } from "playwright";

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
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://empresaservitractor.zohocreatorportal.com/");
    await page.waitForLoadState("networkidle");

    const loginFrame = page.frameLocator("iframe[src*='accounts']");

    await loginFrame.locator("#login_id").fill(userEmail);
    await loginFrame.locator("#nextbtn").click();

    await loginFrame.locator("input#password").waitFor({ state: "visible" });
    await loginFrame.locator("input#password").fill(userPassword);
    await loginFrame.locator("#nextbtn").click();

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