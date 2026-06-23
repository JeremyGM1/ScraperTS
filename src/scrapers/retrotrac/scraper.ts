import { Browser } from "playwright";
import { getInventory } from "./inventory";
import { IProduct } from "../../types/product";
import { isLoginPageVisible } from "../../helpers/is_logged";
import { login } from "./auth";
import fs from "fs";

export async function run(
  browser: Browser, 
  userEmail: string, 
  userPassword: string, 
  refId: string
): Promise<IProduct[] | null> {
  const sessionPath = "sessions/retrotrac.json";
  const context = await browser.newContext({ storageState: fs.existsSync(sessionPath) ? sessionPath : undefined });
  const page = await context.newPage();

  try {
    await page.goto("https://tiendab2b.retrotrac.com/");
    
    if (await isLoginPageVisible(page, "a.item__link[href='#!/login']")) {
      await login(page, userEmail, userPassword);
      
      if(await isLoginPageVisible(page, "a.item__link[href='#!/login']")){
        throw new Error("[Retrotrac] Login failed, check credentials");
      }
      
      await context.storageState({ path: sessionPath });
    }

    const userId = await page.evaluate(() => {
      const raw = localStorage.getItem("currentUser");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.userId || null;
    });

    if(!userId) {
      console.error("[Retrotrac] Could not resolve userId from localStorage");
      return[];
    }

    const response = await page.request.post("https://admin.retrotrac.com/backend/admin/frontend/web/index.php/categoria-info/show-items-by-cattegory",
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

    if (!response.ok()) {
      console.error(`[Retrotrac] Search request failed with status ${response.status()} ${response.statusText()}`);
      return [];
    }

    const json = await response.json();       
    const result = getInventory(json.items ?? []);    
    return result;
  } catch (e) {
    console.error(`[Retrotrac] Unexpected error: ${e}`);
    return [];
  } finally {
    await context.close();
  }
}