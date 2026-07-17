import { config } from "./config";
import { FastifyBaseLogger } from "fastify";
import { isLoginPageVisible } from "../../helpers/is_logged"
import { Page, BrowserContext } from "playwright";
import fs from "fs";

export async function performLogin(
  context: BrowserContext,
  sessionPath: string,
  userEmail: string,
  userPassword: string,
  log: FastifyBaseLogger
) {
  const page = await context.newPage();

  try{
    await page.goto(config.baseURL);
    
    await page.click("a.item__link[href='#!/login']");
    await page.fill("input#email", userEmail);
    await page.fill("input#password", userPassword);
    await page.click("button[type='submit']");
    await page.waitForSelector("a.item__link[href='#!/login']", { state: "hidden" });

    if (await isLoginPageVisible(page, "a.item__link[href='#!/login']")) {
      log.error({ scraper: "retrotrac"}, "Login failed - check credentials");
      throw new Error("[Retrotrac] Login failed, check credentials");
    }

    await context.storageState({ path: sessionPath });
  }finally{
    await page.close();
  }
}

export function getUserIdFromSession(sessionPath: string): string | null{
    if (!fs.existsSync(sessionPath))
        return null;    

    const state = JSON.parse(
        fs.readFileSync(sessionPath, "utf8")
    );

    for (const origin of state.origins ?? []) {
        const currentUser = origin.localStorage?.find(
            (item: { name: string; value: string }) =>
                item.name === "currentUser"
        );

        if (currentUser) {
            const parsed = JSON.parse(currentUser.value);
            return parsed?.userId ?? null;
        }
    }

    return null;
}