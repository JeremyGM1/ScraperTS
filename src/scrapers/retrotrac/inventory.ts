import { APIResponse, Browser, BrowserContext, Page } from "playwright";
import { IProduct } from "../../types/product";
import { getUserIdFromSession } from "./auth";
import { config } from "./config";

interface RetrotracApiItem {
  reference: string;
  name: string;
  currentPrice: string;
  available: number;
}

export async function searchProduct(
  context: BrowserContext,
  refId: string
): Promise<APIResponse | null> {
  const userId = getUserIdFromSession(config.sessionPath);

  if (!userId) {
    console.error("[Retrotrac] Could not resolve from userId from session");
    return null;
  }

  try {
    return await context.request.post(config.searchURL,
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          id: null,
          slug: null,
          pageSize: 12,
          searchText: refId,
          internSearchText: "",
          userId,
          slugPromition: null,
          filters: {
            pageNumber: 1,
            productHighPrice: null,
            productLowPrice: null,
            sort: 1,
          },
        },
      });
    } catch(e) {
      console.error("[Retrotrac] Search request failed: ", e);
      return null;
    }
}

export function getInventory(items: RetrotracApiItem[]): IProduct[] {
  return items.map(item => {
    const marca = item.reference.slice(0, 3);
    const referencia = item.reference.slice(3);
    const precio = parseFloat(item.currentPrice).toString();
    return {
      Referencia: referencia,
      Nombre: item.name,
      Marca  : marca,
      Precio : precio,
      Inventario: item.available,
    }
  });
}