import { describe, it, expect } from "vitest";
import { mapCatekomRows, IGetPageData } from "./mapper";

describe("mapCatekomRows", () => {
    it("maps raw rows into typed products", () => {
        const data: IGetPageData = {
            d: {
                Fields: [
                    { Name: "Cod_Producto" },
                    { Name: "Proveedor_Producto" },
                    { Name: "Descripcion" },
                    { Name: "Cantidad" },
                    { Name: "ventas_minimo" },
                    { Name: "Cod_Emp" },
                ],
                Rows: [
                    ['6P7773', 'CTP', 'RING', 0, 56420.0, '1'],
                    ['6P7773', 'CAT', 'RING SEAL', 0, 38031.538, '1'],
                    ['6P7773', 'USA', 'RING SEAL', 0, 34751.0, '1'],
                ],
                TotalRowCount: 3,
            },
        };

        const result = mapCatekomRows(data);

        expect(result).toEqual([
            { Referencia: "6P7773", Nombre: "RING", Marca: "CTP", Precio: "56420", Inventario: 0, Bodega: "1" },
            { Referencia: "6P7773", Nombre: "RING SEAL", Marca: "CAT", Precio: "38031.538", Inventario: 0, Bodega: "1" },
            { Referencia: "6P7773", Nombre: "RING SEAL", Marca: "USA", Precio: "34751", Inventario: 0, Bodega: "1" },
        ]);
    });

    it("returns an empty array when there are no rows", () => {
        const data: IGetPageData = {
            d: {
                Fields: [{ Name: "Cod_Producto" }],
                Rows: [],
                TotalRowCount: 0,
            },
        };

        expect(mapCatekomRows(data)).toEqual([]);
    });

    it("preserves a zero Inventario instead of dropping it", () => {
        const data: IGetPageData = {
            d: {
                Fields: [{  Name: "Cod_Producto" }, { Name: "Cantidad" }],
                Rows: [["6P7773", 0]],
                TotalRowCount: 1
            },
        };

        const result = mapCatekomRows(data);
        expect(result[0].Inventario).toBe(0);
    });

    it("default missing string fields to empty strings", () => {
        const data: IGetPageData = {
            d: {
                Fields: [{ Name: "Cod_Producto" }],
                Rows: [[ "6P7773" ]],
                TotalRowCount: 1,
            },
        };

        const result = mapCatekomRows(data);
        expect(result[0]).toEqual({
            Referencia: "6P7773",
            Nombre: "",
            Marca: "",
            Precio: "",
            Inventario: 0,
            Bodega: "",
        });
    });

    it("does not throw when fields are empty but rows has data", () => {
        const data: IGetPageData = {
            d: { Fields: [], Rows: [["6P7773"]], TotalRowCount: 1 },
        };
        expect(() => mapCatekomRows(data)).not.toThrow();
    });
});