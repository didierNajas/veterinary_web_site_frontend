import { apiJson, createCrudService } from "../common/api.js";

export const pagosService = createCrudService("/pagos");

export function loadPaymentOptions() {
  return apiJson("/facturas");
}
