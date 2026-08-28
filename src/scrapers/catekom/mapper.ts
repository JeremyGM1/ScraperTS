import { ICatekomProduct } from "../../types/catekom_product";

export interface IGetPageData {
    d: {
        Fields: { Name: string }[];
        Rows: unknown[][];
        TotalRowCount: number;
    };
}

export function mapCatekomRows(data: IGetPageData): ICatekomProduct[] {
    const fieldNames = data.d.Fields.map((f) => f.Name);

    return data.d.Rows.map((row) => {
        const record = Object.fromEntries(fieldNames.map((name, i) => [name, row[i]]));
        return {
            Referencia: String(record.Cod_Producto ?? ""),
            Nombre: String(record.Descripcion ?? ""),
            Marca: String(record.Proveedor_Producto ?? ""),
            Precio: String(record.ventas_minimo ?? ""),
            Inventario: Number(record.Cantidad),
            Bodega: String(record.Cod_Emp ?? ""),
        };
    });
}