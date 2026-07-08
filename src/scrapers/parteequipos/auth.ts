import { BrowserContext, Page } from "playwright";
import { isLoginPageVisible } from "../../helpers/is_logged";
import { config } from "./config";

export async function performLogin(
  context: BrowserContext,
  sessionPath: string,
  userEmail: string,
  userPassword: string
) {
  const page = await context.newPage();

  try {
    await page.goto("https://tienda.partequipos.com/", {
      waitUntil: "networkidle",
    });

    const isLoginVisible = await page.isVisible("a.customer-login-link");
    if (!isLoginVisible) {
      console.log("[Parte Equipos] Login button not visible, assuming session is already authenticated.");
      await context.storageState({ path: sessionPath });
      return;
    }

    await page.click("a.customer-login-link");
    await page.waitForSelector("#email-login", { timeout: 15000 });

    await page.fill("input#email-login", userEmail);
    await page.fill("input#pass-login", userPassword);

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 }),
      page.click("#send2-login"),
    ]);

    if (await isLoginPageVisible(page, "input#email-login")) {
      throw new Error("[Parte Equipos] Login failed, check credentials");
    }

    await context.storageState({ path: sessionPath });
  } finally {
    await page.close();
  }
}

export async function isSessionValid(context: import("playwright").BrowserContext): Promise<boolean> {
  const page = await context.newPage();
  try {
    await page.goto(config.baseURL, {
      waitUntil: "networkidle",
    });

    const isLoginVisible = await page.isVisible("a.customer-login-link");
    return !isLoginVisible;
  } catch (err) {
    console.error("[Parte Equipos] Session validation failed:", err);
    return false;
  } finally {
    await page.close();
  }
}