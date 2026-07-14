import { APIResponse, Browser, BrowserContext, Page } from "playwright";
import { getUserIdFromSession } from "./auth";
import { config } from "./config";

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