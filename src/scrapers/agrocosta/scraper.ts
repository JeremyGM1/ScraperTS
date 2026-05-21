import { Browser } from "playwright";
import { IAgrocostaProduct } from "../../types/agrocosta_product";
import { IProduct } from "../../types/product";
import { isLogged } from "../../helpers/is_logged";
import { isNotFound } from "../../helpers/is_not_found";
import { login } from "./auth";
import fs from "fs";

export async function run(
browser: Browser,
username: string,
password: string,
refId: string
):Promise<IAgrocostaProduct[] | null> {
    const sessionPath = "sessions/agrocosta.json";
    const context = await browser.newContext({ storageState: fs.existsSync(sessionPath) ? sessionPath : undefined });
    const page = await context.newPage();

    try{
        await page.goto("https://agro-costa.com/consulta/consulta_inventario.php");
        
        if (await isLogged(page, "div.card-header:has-text('Iniciar sesión')")) {
            console.log("[Agrocosta] Not logged in, performing login...");
            await login(page, username, password);
            await context.storageState({path: sessionPath})
        }else{
           console.log("[Agrocosta] Already logged in, skipping login.");      
        }

        await page.fill("input[name='referencia']", refId);
        await page.click("button[name='buscar']");

        await page.waitForLoadState("networkidle");

        const results: IAgrocostaProduct[] = [];
        const importResults: IProduct[] = [];

        if (await isNotFound(page, "div.alert.alert-danger", "No se encontraron resultados para la referencia")) {
            console.log(`[Agrocosta] Product ${refId} not found`);
            return [];   
        }

        await page.waitForSelector("tbody tr", {state: "visible"});
        const rows = await page.locator("tbody tr").all();

        for (const row of rows){
            const cells = await row.locator("td").all();
            if (cells.length < 7) continue;

            results.push({
                Referencia: (await cells[0].innerText()).trim(),
                Nombre: (await cells[1].innerText()).trim(),
                Barranquilla: (await cells[2].locator("div.stock-badge").innerText()).trim(),
                Bogota: (await cells[3].innerText()).trim(),
                Marca: (await cells[5].innerText()).trim(),
                Precio: (await cells[6].innerText()).trim(),
            });
        }
        
        return results;
    }catch(e){
        console.error(`[Agrocosta] Error extracting product: ${e}`);
        return null;
    }finally{
        await context.close();
    }
}