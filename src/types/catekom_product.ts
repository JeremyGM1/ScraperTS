import { IProduct } from "./product";

export interface ICatekomProduct extends IProduct{
    Inventario: number;
    Bodega: string
}