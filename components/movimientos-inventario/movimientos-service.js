import { apiJson, createCrudService } from "../common/api.js";

export const movimientosService = createCrudService("/movimientos-inventario");

export function loadMovementOptions() {
  return apiJson("/productos");
}
