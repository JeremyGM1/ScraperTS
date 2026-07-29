import { IProduct } from "./product";

interface IParteequiposProduct extends IProduct {
  Monterrey?: number;
}

interface IParsedProduct extends IParteequiposProduct {
  internalId: string;
}

export type { IParteequiposProduct, IParsedProduct };