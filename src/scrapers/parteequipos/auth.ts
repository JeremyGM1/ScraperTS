import { config } from "./config";
import { FastifyBaseLogger } from "fastify";
import { Page } from "playwright";

export async function performLogin(
  page: Page,
  sessionPath: string,
  userEmail: string,
  userPassword: string,
  log: FastifyBaseLogger
): Promise<void> {
  await page.goto(config.baseURL, { waitUntil: "networkidle", timeout: 30000 });

  const isLoginVisible = await page.isVisible("a.customer-login-link");

  if (!isLoginVisible) {
    log.warn({ scraper: "Parte Equipos" }, "Login button not visible, assuming session is already authenticated.");
    await page.context().storageState({ path: sessionPath });
    return;
  }

  await page.click("a.customer-login-link");
  await page.waitForSelector("#email-login", { timeout: 15000 });

  await page.fill("#email-login", userEmail);
  await page.fill("#pass-login", userPassword);

  try {
    await page.click("#send2-login");
    
    await page.waitForSelector("a.customer-login-link", { state: "hidden", timeout: 30000});
    await page.waitForLoadState("networkidle");
  } catch(e) {  
    log.error({ scraper: "Parte Equipos", e }, "Login link still visible after submit — login likely failed.");
    throw new Error("Login failed, check credentials");
  }
  
  await page.context().storageState({ path: sessionPath });
}

export async function isSessionValid(page: Page, log: FastifyBaseLogger): Promise<boolean> {
  try {
    await page.goto(config.baseURL, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const isLoginVisible = await page.isVisible("a.customer-login-link");
    return !isLoginVisible;
  } catch (err) {
    log.error({ scraper: "Parte Equipos", err }, "Session validation failed");
    return false;
  }
}