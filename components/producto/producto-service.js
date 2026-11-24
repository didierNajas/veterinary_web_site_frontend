import { apiJson, createCrudService } from "../common/api.js";

export const productosService = createCrudService("/productos");

export function listCategories() {
  return apiJson("/categorias");
}
