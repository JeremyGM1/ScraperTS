import { IProduct } from "../../types/product";

interface RetrotracApiItem {
  reference: string;
  name: string;
  priceTax: string;
  available: number;
}

export function getInventory(items: RetrotracApiItem[]): IProduct[] {
  return items.map(item => ({
    Referencia: item.reference,
    Nombre: item.name,
    Marca  : "",
    Precio : item.priceTax,
    Inventario: item.available,
  }));
}