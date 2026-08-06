import { APIResponse, BrowserContext } from "playwright";
import { config } from "./config";
import { FastifyBaseLogger } from "fastify";
import { getUserIdFromSession } from "./auth";
import { ref } from "node:process";

export async function searchProduct(
  context: BrowserContext,
  refId: string,
  log: FastifyBaseLogger
): Promise<APIResponse> {
  const userId = getUserIdFromSession(config.sessionPath);

  if (!userId) {
    log.error({ scraper: "retrotrac", refId: refId }, "Could not resolve userId from session");
    throw new Error("Could not resolve userId from session");
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
      log.error({ scraper: "retrotrac", refId: refId, err: e }, "Search request failed");      
      throw e instanceof Error ? e : new Error(String(e));
    }
}