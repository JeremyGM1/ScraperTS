import { IProduct } from "../../types/product";

interface RetrotracApiItem {
  reference: string;
  name: string;
  currentPrice: string;
  available: number;
}

export function mapRetrotracItemsToProducts(items: RetrotracApiItem[]): IProduct[] {
  return items.map(item => {
    const marca = item.reference.slice(0, 3);
    const referencia = item.reference.slice(3);
    const precio = parseFloat(item.currentPrice).toString();
    return {
      Referencia: referencia,
      Nombre: item.name,
      Marca  : marca,
      Precio : precio,
      Inventario: item.available,
    }
  });
}