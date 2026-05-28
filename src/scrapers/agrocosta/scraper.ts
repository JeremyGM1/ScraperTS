import { Browser } from "playwright";
import { IAgrocostaProduct } from "../../types/agrocosta_product";
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

        if (await isNotFound(page, "div.alert.alert-danger", "No se encontraron resultados para la referencia")) {
            console.log(`[Agrocosta] Product ${refId} not found`);
            return [];   
        }

        await page.waitForSelector("tbody tr", {state: "visible"});
        const tables = await page.locator("table").all();

        for (const table of tables) {
            // Build columnMap per table so each thead stays in sync with its tbody
            const headers = await table.locator("thead tr th").all();
            const columnMap: Record<string, number> = {};
            for (let i = 0; i < headers.length; i++) {
                const text = (await headers[i].innerText()).trim().toLocaleLowerCase().replace(/\s+/g, " ");
                columnMap[text] = i;
            }

            const rows = await table.locator("tbody tr").all();

            for (const row of rows) {
                const cells = await row.locator("td").all();
                if (cells.length < 4) continue;

                const getCell = async (headerKey: string) => {
                    const idx = columnMap[headerKey];
                    if (idx === undefined || idx >= cells.length) return "";
                    return (await cells[idx].innerText()).trim();
                };

                const barranquillaIdx = columnMap["bodega barranquilla"] ?? columnMap["disponible"];
                let barranquilla = "";
                if (barranquillaIdx !== undefined) {
                    const stockBadge = cells[barranquillaIdx].locator("div.stock-badge");
                    if (await stockBadge.count() > 0) {
                        barranquilla = (await stockBadge.innerText()).trim();
                    } else {
                        barranquilla = (await cells[barranquillaIdx].evaluate(el =>
                            Array.from(el.childNodes)
                                .filter(n => n.nodeType === Node.TEXT_NODE)
                                .map(n => n.textContent?.trim())
                                .filter(Boolean)
                                .join(" ")
                        )).trim();
                    }
                }

                results.push({
                    Referencia: await getCell("referencia"),
                    Nombre: await getCell("descripción"),
                    Barranquilla: barranquilla,
                    Bogota: await getCell("bodega bogotá"),
                    Marca: await getCell("marca"),
                    Precio: await getCell("precio antes de iva"),
                });
            }
        }
        
        return results;
    }catch(e){
        console.error(`[Agrocosta] Error extracting product: ${e}`);
        return null;
    }finally{
        await context.close();
    }
}