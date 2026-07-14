import { IProduct } from "../../types/product";

interface serviApiItem {
  "Art_culos.C_digo": string;
  "Nombre": string;
  zc_Existencias_search: string;
  zc_precio_cotizado_antes_de_iva_search: string;
}

export interface ServiApiResponse {
  MODEL: {
    DATAJSONARRAY: serviApiItem[];
  };
}

export function mapServiItemsToProducts(items: serviApiItem[]): IProduct[] {
  return items.map(item => {
    const rawReferencia = item["Art_culos.C_digo"];
    const marca = rawReferencia.slice(-3);
    const referencia = rawReferencia.slice(0, -3);

    return {
      Referencia: referencia,
      Nombre: item["Nombre"],
      Marca: marca,
      Precio: item["zc_precio_cotizado_antes_de_iva_search"],
      Inventario: parseInt(item["zc_Existencias_search"], 10),
    }
  });
}