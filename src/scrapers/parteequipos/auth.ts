import { config } from "./config";
import { FastifyBaseLogger } from "fastify";
import { isLoginPageVisible } from "../../helpers/is_logged";
import { Page } from "playwright";

export async function performLogin(
  page: Page,
  sessionPath: string,
  userEmail: string,
  userPassword: string,
  log: FastifyBaseLogger
): Promise<void> {
  const isLoginVisible = await page.isVisible("a.customer-login-link");

  if (!isLoginVisible) {
    log.warn(
      { scraper: "Parte Equipos" },
      "Login button not visible, assuming session is already authenticated."
    );

    await page.context().storageState({ path: sessionPath });
    return;
  }

  await page.click("a.customer-login-link");
  await page.waitForSelector("#email-login", { timeout: 15000 });

  await page.fill("#email-login", userEmail);
  await page.fill("#pass-login", userPassword);
  
  try {
    await Promise.all([
      page.waitForURL("https://tienda.partequipos.com/customer/account/", { waitUntil: "networkidle", timeout: 30000 }),
      page.click("#send2-login"),
    ]);    
  } catch {
    throw new Error("[Parte Equipos] Login failed, check credentials");
  }

  if (await isLoginPageVisible(page, "input#email-login")) {
    throw new Error("[Parte Equipos] Login failed, check credentials");
  }
  
  await page.context().storageState({ path: sessionPath });
}

export async function isSessionValid(
  page: Page,
  log: FastifyBaseLogger
): Promise<boolean> {
  try {
    await page.goto(config.baseURL, {
      waitUntil: "networkidle",
    });

    const isLoginVisible = await page.isVisible("a.customer-login-link");
    return !isLoginVisible;
  } catch (err) {
    log.error(
      { scraper: "Parte Equipos", err },
      "Session validation failed"
    );

    return false;
  }
}