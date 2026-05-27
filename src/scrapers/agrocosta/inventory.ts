import { Locator } from "playwright";
import { IAgrocostaProduct } from "../../types/agrocosta_product";

export async function getInventory(tables: Locator[]): Promise<IAgrocostaProduct[]> {
  const results: IAgrocostaProduct[] = [];

  for (const table of tables) {            
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
}