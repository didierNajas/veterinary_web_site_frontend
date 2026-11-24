import {
  apiRequest,
  authHeaders,
  escapeHtml,
  formatCurrency,
  getToken,
  hideMessage,
  logout,
  responseError,
  showMessage,
} from "../common/api.js";

const productosTableBody = document.getElementById("productosTableBody");
const productoMessage = document.getElementById("productoMessage");
const productoDialog = document.getElementById("productoDialog");
const productoForm = document.getElementById("productoForm");
const productoFormMessage = document.getElementById("productoFormMessage");
const addProductoBtn = document.getElementById("addProductoBtn");

let productos = [];
let categorias = [];
let editingId = null;

async function loadCategorias() {
  const response = await apiRequest("/categorias", { headers: authHeaders() });
  if (!response) return false;
  if (!response.ok) throw new Error(await responseError(response));

  categorias = await response.json();
  renderCategoriaOptions();
  addProductoBtn.disabled = categorias.length === 0;
  if (!categorias.length) {
    showMessage(productoMessage, "error", "No hay categorías disponibles; no se pueden crear productos.");
  }
  return true;
}

function renderCategoriaOptions(selectedId = null) {
  const select = productoForm.elements.namedItem("idCategoria");
  select.innerHTML = `
    <option value="">Selecciona una categoría</option>
    ${categorias.map((categoria) => `
      <option value="${escapeHtml(categoria.idCategoria)}">${escapeHtml(categoria.categoria)}</option>
    `).join("")}
  `;
  if (selectedId !== null) select.value = String(selectedId);
}

async function loadProductos() {
  hideMessage(productoMessage);
  productosTableBody.innerHTML = `<tr><td colspan="7">Cargando productos...</td></tr>`;

  try {
    const response = await apiRequest("/productos", { headers: authHeaders() });
    if (!response) return false;
    if (!response.ok) throw new Error(await responseError(response));

    productos = await response.json();
    renderProductos();
    return true;
  } catch (error) {
    productosTableBody.innerHTML = `<tr><td colspan="7">No se pudieron cargar los productos.</td></tr>`;
    showMessage(productoMessage, "error", error.message || "No se pudieron cargar los productos.");
    console.error("Error cargando productos:", error);
    return false;
  }
}

function renderProductos() {
  if (!productos.length) {
    productosTableBody.innerHTML = `<tr><td colspan="7">No hay productos registrados.</td></tr>`;
    return;
  }

  const categoriasPorId = new Map(categorias.map((categoria) => [
    Number(categoria.idCategoria),
    categoria.categoria,
  ]));

  productosTableBody.innerHTML = productos.map((producto) => `
    <tr>
      <td>${escapeHtml(producto.idProducto)}</td>
      <td>${escapeHtml(producto.producto)}</td>
      <td>${escapeHtml(categoriasPorId.get(Number(producto.idCategoria)) || `Categoría #${producto.idCategoria}`)}</td>
      <td>${escapeHtml(formatCurrency(producto.valorUnitarioCompra))}</td>
      <td>${escapeHtml(formatCurrency(producto.valorUnitarioVenta))}</td>
      <td><span class="badge ${producto.activo ? "badge-active" : "badge-inactive"}">${producto.activo ? "Activo" : "Inactivo"}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-warning" data-action="edit" data-id="${escapeHtml(producto.idProducto)}">Editar</button>
          ${producto.activo
            ? `<button type="button" class="btn btn-danger" data-action="deactivate" data-id="${escapeHtml(producto.idProducto)}">Desactivar</button>`
            : ""}
        </div>
      </td>
    </tr>
  `).join("");
}

function openProductoDialog(producto = null) {
  hideMessage(productoFormMessage);
  productoForm.reset();
  editingId = producto ? producto.idProducto : null;
  document.getElementById("productoDialogTitle").textContent = producto ? "Editar producto" : "Nuevo producto";

  if (producto) {
    renderCategoriaOptions(producto.idCategoria);
    productoForm.elements.namedItem("producto").value = producto.producto || "";
    productoForm.elements.namedItem("valorUnitarioCompra").value = producto.valorUnitarioCompra;
    productoForm.elements.namedItem("valorUnitarioVenta").value = producto.valorUnitarioVenta;
    productoForm.elements.namedItem("activo").value = String(Boolean(producto.activo));
  } else {
    renderCategoriaOptions();
    productoForm.elements.namedItem("activo").value = "true";
  }

  productoDialog.showModal();
}

async function saveProducto(event) {
  event.preventDefault();
  hideMessage(productoFormMessage);

  const payload = {
    idCategoria: Number(productoForm.elements.namedItem("idCategoria").value),
    producto: productoForm.elements.namedItem("producto").value.trim(),
    valorUnitarioCompra: Number(productoForm.elements.namedItem("valorUnitarioCompra").value),
    valorUnitarioVenta: Number(productoForm.elements.namedItem("valorUnitarioVenta").value),
    activo: productoForm.elements.namedItem("activo").value === "true",
  };
  const path = editingId ? `/productos/${editingId}` : "/productos";

  try {
    const response = await apiRequest(path, {
      method: editingId ? "PUT" : "POST",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    });
    if (!response) return;
    if (!response.ok) {
      showMessage(productoFormMessage, "error", await responseError(response));
      return;
    }

    productoDialog.close();
    const saved = await loadProductos();
    if (saved) showMessage(productoMessage, "success", editingId
      ? "Producto actualizado correctamente."
      : "Producto creado correctamente.");
  } catch (error) {
    showMessage(productoFormMessage, "error", "No se pudo guardar el producto.");
    console.error("Error guardando producto:", error);
  }
}

async function deactivateProducto(id) {
  const producto = productos.find((item) => Number(item.idProducto) === Number(id));
  if (!producto || !window.confirm(`¿Desactivar "${producto.producto}"?`)) return;

  try {
    const response = await apiRequest(`/productos/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!response) return;
    if (!response.ok) {
      showMessage(productoMessage, "error", await responseError(response));
      return;
    }

    const loaded = await loadProductos();
    if (loaded) showMessage(productoMessage, "success", "Producto desactivado correctamente.");
  } catch (error) {
    showMessage(productoMessage, "error", "No se pudo desactivar el producto.");
    console.error("Error desactivando producto:", error);
  }
}

productosTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  if (button.dataset.action === "edit") {
    const producto = productos.find((item) => Number(item.idProducto) === Number(button.dataset.id));
    if (producto) openProductoDialog(producto);
  } else if (button.dataset.action === "deactivate") {
    deactivateProducto(button.dataset.id);
  }
});

document.getElementById("reloadProductosBtn").addEventListener("click", async () => {
  try {
    if (await loadCategorias()) {
      await loadProductos();
      if (!categorias.length) {
        showMessage(productoMessage, "error", "No hay categorías disponibles; no se pueden crear productos.");
      }
    }
  } catch (error) {
    showMessage(productoMessage, "error", error.message || "No se pudieron cargar las categorías.");
    console.error("Error cargando categorías:", error);
  }
});
addProductoBtn.addEventListener("click", () => openProductoDialog());
document.getElementById("cancelProductoBtn").addEventListener("click", () => productoDialog.close());
document.getElementById("logoutBtn").addEventListener("click", logout);
productoForm.addEventListener("submit", saveProducto);

if (!getToken()) {
  logout();
} else {
  try {
    if (await loadCategorias()) {
      await loadProductos();
      if (!categorias.length) {
        showMessage(productoMessage, "error", "No hay categorías disponibles; no se pueden crear productos.");
      }
    }
  } catch (error) {
    showMessage(productoMessage, "error", error.message || "No se pudo inicializar la gestión de productos.");
    console.error("Error inicializando productos:", error);
  }
}
