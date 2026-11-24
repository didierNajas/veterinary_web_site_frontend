import { apiJson, createCrudService } from "../common/api.js";

export const facturasService = createCrudService("/facturas");

export function loadInvoiceOptions() {
  return Promise.all([
    apiJson("/users/me"),
    apiJson("/companias"),
    apiJson("/inventario"),
    apiJson("/productos"),
  ]);
}
