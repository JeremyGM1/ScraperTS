import { ElementHandle } from "playwright";

export async function getText(element: ElementHandle, selector: string): Promise<string> {
  const el = await element.$(selector);
  if (!el) throw new Error(`Element with selector '${selector}' not found.`);
  return el.innerText();
}