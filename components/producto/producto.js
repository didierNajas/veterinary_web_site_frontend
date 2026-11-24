import {
  escapeHtml,
  formatCurrency,
  getToken,
  hideMessage,
  logout,
  showMessage,
} from "../common/api.js";
import { initPreferences } from "../common/preferences.js";
import { listCategories, productosService } from "./producto-service.js";

const translations = {
  es: {
    pageTitle: "Productos | VetCare",
    eyebrow: "CATÁLOGO",
    heading: "Productos",
    intro: "Administra el catálogo y los valores unitarios.",
    preferences: "Preferencias",
    managementNav: "Gestión",
    tableScroll: "Tabla de productos desplazable",
    navCompanies: "Compañías",
    navInvoices: "Facturas",
    navPayments: "Pagos",
    navMovements: "Movimientos",
    navProducts: "Productos",
    navTerms: "Términos",
    navSchedules: "Horarios",
    listHeading: "Productos",
    listHint: "Los productos desactivados se conservan en el historial.",
    refresh: "Actualizar lista",
    addProduct: "Nuevo producto",
    tableCaption: "Productos registrados",
    id: "ID",
    product: "Producto",
    category: "Categoría",
    purchasePrice: "Valor unitario de compra (COP)",
    salePrice: "Valor unitario de venta (COP)",
    status: "Estado",
    actions: "Acciones",
    loading: "Cargando productos…",
    empty: "No hay productos registrados.",
    loadError: "No se pudieron cargar los productos.",
    loadErrorRow: "No se pudieron cargar los productos. Usa Actualizar lista para intentarlo de nuevo.",
    chooseCategory: "Selecciona una categoría",
    categoryLoading: "Cargando categorías…",
    productName: "Nombre del producto",
    active: "Activo",
    inactive: "Inactivo",
    deactivate: "Desactivar",
    editProduct: "Editar producto",
    saveProduct: "Guardar producto",
    saving: "Guardando…",
    created: "Producto creado correctamente.",
    updated: "Producto actualizado correctamente.",
    deactivated: "Producto desactivado correctamente.",
    noCategories: "No hay categorías disponibles; no se pueden crear productos.",
    deleteConfirm: "¿Desactivar “{name}”? El registro y el historial de facturación se conservarán.",
    editAria: "Editar producto {name}",
    deactivateAria: "Desactivar producto {name}",
    saveError: "No se pudo guardar el producto.",
    deleteError: "No se pudo desactivar el producto.",
  },
  en: {
    pageTitle: "Products | VetCare",
    eyebrow: "CATALOG",
    heading: "Products",
    intro: "Manage the catalog and unit prices.",
    preferences: "Preferences",
    managementNav: "Management",
    tableScroll: "Scrollable products table",
    navCompanies: "Companies",
    navInvoices: "Invoices",
    navPayments: "Payments",
    navMovements: "Movements",
    navProducts: "Products",
    navTerms: "Terms",
    navSchedules: "Schedules",
    listHeading: "Products",
    listHint: "Deactivated products remain in the history.",
    refresh: "Refresh list",
    addProduct: "New product",
    tableCaption: "Registered products",
    id: "ID",
    product: "Product",
    category: "Category",
    purchasePrice: "Unit purchase price (COP)",
    salePrice: "Unit sale price (COP)",
    status: "Status",
    actions: "Actions",
    loading: "Loading products…",
    empty: "No products are registered.",
    loadError: "Could not load products.",
    loadErrorRow: "Could not load products. Use Refresh list to try again.",
    chooseCategory: "Choose a category",
    categoryLoading: "Loading categories…",
    productName: "Product name",
    active: "Active",
    inactive: "Inactive",
    deactivate: "Deactivate",
    editProduct: "Edit product",
    saveProduct: "Save product",
    saving: "Saving…",
    created: "Product created successfully.",
    updated: "Product updated successfully.",
    deactivated: "Product deactivated successfully.",
    noCategories: "No categories are available, so products cannot be created.",
    deleteConfirm: "Deactivate “{name}”? The product and its invoice history will be retained.",
    editAria: "Edit product {name}",
    deactivateAria: "Deactivate product {name}",
    saveError: "Could not save the product.",
    deleteError: "Could not deactivate the product.",
  },
};

const preferences = initPreferences(translations);
const { t } = preferences;
const productsTableBody = document.getElementById("productosTableBody");
const productMessage = document.getElementById("productoMessage");
const productDialog = document.getElementById("productoDialog");
const productForm = document.getElementById("productoForm");
const productFormMessage = document.getElementById("productoFormMessage");
const addProductButton = document.getElementById("addProductoBtn");
const saveProductButton = productForm.querySelector('[type="submit"]');

let products = [];
let categories = [];
let editingId = null;
let loading = false;
let loadFailed = false;

function money(value) {
  return formatCurrency(value, preferences.locale);
}

async function loadCategories() {
  categories = await listCategories();
  if (!categories) return false;
  renderCategoryOptions();
  if (!categories.length) {
    addProductButton.disabled = true;
    showMessage(productMessage, "error", t("noCategories"));
  }
  return true;
}

function renderCategoryOptions(selectedId = null) {
  const select = productForm.elements.namedItem("idCategoria");
  select.innerHTML = `
    <option value="">${escapeHtml(t("chooseCategory"))}</option>
    ${categories.map((category) => `
      <option value="${escapeHtml(category.idCategoria)}" ${Number(category.idCategoria) === Number(selectedId) ? "selected" : ""}>${escapeHtml(category.categoria)}</option>
    `).join("")}
  `;
}

function renderProducts() {
  if (loading) {
    productsTableBody.innerHTML = `<tr><td class="state-row" colspan="7">${escapeHtml(t("loading"))}</td></tr>`;
    return;
  }
  if (loadFailed && !products.length) {
    productsTableBody.innerHTML = `<tr><td class="state-row" colspan="7">${escapeHtml(t("loadErrorRow"))}</td></tr>`;
    return;
  }
  if (!products.length) {
    productsTableBody.innerHTML = `<tr><td class="state-row" colspan="7">${escapeHtml(t("empty"))}</td></tr>`;
    return;
  }

  const categoriesById = new Map(categories.map((category) => [
    Number(category.idCategoria),
    category.categoria,
  ]));
  productsTableBody.innerHTML = products.map((product) => `
    <tr>
      <td>#${escapeHtml(product.idProducto)}</td>
      <td>${escapeHtml(product.producto)}</td>
      <td>${escapeHtml(categoriesById.get(Number(product.idCategoria)) || `#${product.idCategoria}`)}</td>
      <td>${escapeHtml(money(product.valorUnitarioCompra))}</td>
      <td>${escapeHtml(money(product.valorUnitarioVenta))}</td>
      <td><span class="badge ${product.activo ? "badge-active" : "badge-inactive"}">${escapeHtml(t(product.activo ? "active" : "inactive"))}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-warning" data-action="edit" data-id="${escapeHtml(product.idProducto)}" aria-label="${escapeHtml(t("editAria", { name: product.producto }))}">${escapeHtml(t("edit"))}</button>
          ${product.activo
            ? `<button type="button" class="btn btn-danger" data-action="deactivate" data-id="${escapeHtml(product.idProducto)}" aria-label="${escapeHtml(t("deactivateAria", { name: product.producto }))}">${escapeHtml(t("deactivate"))}</button>`
            : ""}
        </div>
      </td>
    </tr>
  `).join("");
}

async function loadProducts() {
  loading = true;
  loadFailed = false;
  productsTableBody.setAttribute("aria-busy", "true");
  document.getElementById("reloadProductosBtn").disabled = true;
  addProductButton.disabled = true;
  hideMessage(productMessage);
  renderProducts();
  try {
    const records = await productosService.list();
    if (!records) return false;
    products = records;
    loadFailed = false;
    return true;
  } catch (error) {
    loadFailed = true;
    showMessage(productMessage, "error", error.message || t("loadError"));
    console.error("Error cargando productos:", error);
    return false;
  } finally {
    loading = false;
    productsTableBody.setAttribute("aria-busy", "false");
    document.getElementById("reloadProductosBtn").disabled = false;
    addProductButton.disabled = categories.length === 0;
    renderProducts();
    if (!loadFailed && !categories.length) showMessage(productMessage, "error", t("noCategories"));
  }
}

function openProductDialog(product = null) {
  hideMessage(productFormMessage);
  productForm.reset();
  editingId = product?.idProducto ?? null;
  document.getElementById("productoDialogTitle").textContent = product ? t("editProduct") : t("addProduct");
  renderCategoryOptions(product?.idCategoria ?? null);
  if (product) {
    productForm.elements.namedItem("producto").value = product.producto || "";
    productForm.elements.namedItem("valorUnitarioCompra").value = product.valorUnitarioCompra;
    productForm.elements.namedItem("valorUnitarioVenta").value = product.valorUnitarioVenta;
    productForm.elements.namedItem("activo").value = String(Boolean(product.activo));
  } else {
    productForm.elements.namedItem("activo").value = "true";
  }
  productDialog.showModal();
  productForm.elements.namedItem("idCategoria").focus();
}

async function saveProduct(event) {
  event.preventDefault();
  hideMessage(productFormMessage);
  if (!productForm.reportValidity()) return;

  const payload = {
    idCategoria: Number(productForm.elements.namedItem("idCategoria").value),
    producto: productForm.elements.namedItem("producto").value.trim(),
    valorUnitarioCompra: Number(productForm.elements.namedItem("valorUnitarioCompra").value),
    valorUnitarioVenta: Number(productForm.elements.namedItem("valorUnitarioVenta").value),
    activo: productForm.elements.namedItem("activo").value === "true",
  };
  const savedId = editingId;
  saveProductButton.disabled = true;
  saveProductButton.textContent = t("saving");
  try {
    const result = await productosService.save(savedId, payload);
    if (!result) return;
    productDialog.close();
    const saved = await loadProducts();
    if (saved) showMessage(productMessage, "success", t(savedId ? "updated" : "created"));
  } catch (error) {
    showMessage(productFormMessage, "error", error.message || t("saveError"));
    console.error("Error guardando producto:", error);
  } finally {
    saveProductButton.disabled = false;
    saveProductButton.textContent = t("saveProduct");
  }
}

async function deactivateProduct(id) {
  const product = products.find((item) => Number(item.idProducto) === Number(id));
  if (!product || !window.confirm(t("deleteConfirm", { name: product.producto }))) return;
  try {
    const result = await productosService.remove(id);
    if (!result) return;
    const loaded = await loadProducts();
    if (loaded) showMessage(productMessage, "success", t("deactivated"));
  } catch (error) {
    showMessage(productMessage, "error", error.message || t("deleteError"));
    console.error("Error desactivando producto:", error);
  }
}

productsTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const product = products.find((item) => Number(item.idProducto) === Number(button.dataset.id));
  if (!product) return;
  if (button.dataset.action === "edit") openProductDialog(product);
  if (button.dataset.action === "deactivate") deactivateProduct(product.idProducto);
});

document.getElementById("reloadProductosBtn").addEventListener("click", async () => {
  try {
    const categoriesLoaded = await loadCategories();
    if (categoriesLoaded) await loadProducts();
  } catch (error) {
    showMessage(productMessage, "error", error.message || t("loadError"));
    console.error("Error cargando categorías:", error);
  }
});
addProductButton.addEventListener("click", () => openProductDialog());
document.getElementById("cancelProductoBtn").addEventListener("click", () => productDialog.close());
document.getElementById("logoutBtn").addEventListener("click", logout);
productForm.addEventListener("submit", saveProduct);
window.addEventListener("vetcare:preferences", () => {
  hideMessage(productMessage);
  renderProducts();
  if (productDialog.open) {
    const product = products.find((item) => Number(item.idProducto) === Number(editingId));
    document.getElementById("productoDialogTitle").textContent = product ? t("editProduct") : t("addProduct");
    renderCategoryOptions(product?.idCategoria ?? productForm.elements.namedItem("idCategoria").value);
  }
});

if (!getToken()) {
  logout();
} else {
  addProductButton.disabled = true;
  try {
    if (await loadCategories()) await loadProducts();
  } catch (error) {
    loadFailed = true;
    showMessage(productMessage, "error", error.message || t("loadError"));
    renderProducts();
    console.error("Error inicializando productos:", error);
  }
}
