import { describe, it, expect } from "vitest";
import { mapRetrotracItemsToProducts } from "./mappers";

describe("mapRetrotracItemsToProducts", () => {
  it("splits reference into Marca (First 3 chars) and Referencia (The rest)", () => {
    const items = [
      { reference: "CTP6P7773", name: "RING", currentPrice: "56420.00", available: 4 },
    ];

    const results = mapRetrotracItemsToProducts(items);
    
    expect(results).toEqual([
      { Referencia: "6P7773", Nombre: "RING", Marca: "CTP", Precio: "56420", Inventario: 4 },
    ]);
  });

  it("maps multiple items independently", () => {
    const items = [
      { reference: "CTP6P7773", name: "RING", currentPrice: "56420", available: 4 },
      { reference: "CATRING01", name: "RING SEAL", currentPrice: "38031.538", available: 0 },
    ];

    const results = mapRetrotracItemsToProducts(items);
    
    expect(results).toEqual([
      { reference: 'CTP6P7773', name: 'RING', currentPrice: '56420', available: 4 },
      { reference: 'CATRING01', name: 'RING SEAL', currentPrice: '38031.538', available: 0 },
    ]);
  });
});