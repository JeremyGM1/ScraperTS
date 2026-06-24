import { APIResponse, Browser, BrowserContext, Page } from "playwright";
import { IProduct } from "../../types/product";
import { getUserIdFromSession } from "./auth";

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
  const userId = getUserIdFromSession("sessions/retrotrac.json");

  if (!userId) {
    console.error("[Retrotrac] Could not resolve from userId from session");
    return null;
  }

  try {
    return await context.request.post("https://admin.retrotrac.com/backend/admin/frontend/web/index.php/categoria-info/show-items-by-cattegory",
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
  return items.map(item => ({
    Referencia: item.reference,
    Nombre: item.name,
    Marca  : "",
    Precio : item.currentPrice,
    Inventario: item.available,
  }));
}