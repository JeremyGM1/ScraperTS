import { IProduct } from "../../types/product";
import { getText } from "../../helpers/get_element";
import { ElementHandle, Page } from "playwright";

export async function extractRetrotracProduct(product: ElementHandle): Promise<IProduct | null> {
  try {
    const reference = (await getText(product, "h6.box-product__name a")).replace("Ref: ", "").trim();
    const quantityDiv = await getText(product, "div.box-product__name.color-base");
    const quantity = quantityDiv.split(": ")[1].trim();
    const name = (await getText(product, "div.box-product__reference")).trim();
    const price = (await getText(product, "div.box-product__price-normal")).trim();

    return {
      Referencia: reference,
      Nombre: name,
      Marca: "",
      Precio: price,
      Inventario: parseInt(quantity),
    };
  } catch (e) {
    console.error(`[Retrotrac] Error extracting product: ${e}`);
    return null;
  }
}

export async function getInventory(page: Page): Promise<IProduct[]> {
  const products = await page.$$(".box-product");
  const results: IProduct[] = [];
  for (const product of products) {
    const item = await extractRetrotracProduct(product);
    if (item) results.push(item);
  }    
  return results;
}