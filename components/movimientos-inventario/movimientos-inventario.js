import { escapeHtml, getToken, hideMessage, logout, showMessage } from "../common/api.js";
import { initPreferences } from "../common/preferences.js";
import { loadMovementOptions, movimientosService } from "./movimientos-service.js";

const translations = {
  es: {
    pageTitle: "Movimientos de inventario | VetCare",
    preferences: "Preferencias",
    managementNav: "Gestión",
    tableScroll: "Tabla de movimientos desplazable",
    eyebrow: "INVENTARIO",
    heading: "Movimientos de inventario",
    intro: "Registra entradas y salidas de productos.",
    navCompanies: "Compañías",
    navInvoices: "Facturas",
    navPayments: "Pagos",
    navMovements: "Movimientos",
    navProducts: "Productos",
    navTerms: "Términos",
    navSchedules: "Horarios",
    listHeading: "Registro de movimientos",
    listHint: "El registro no calcula ni modifica una existencia acumulada.",
    addMovement: "Nuevo movimiento",
    tableCaption: "Movimientos de inventario registrados",
    id: "ID",
    date: "Fecha",
    product: "Producto",
    type: "Tipo",
    quantity: "Cantidad",
    term: "Término",
    reference: "Referencia",
    actions: "Acciones",
    loadingMovements: "Cargando movimientos…",
    emptyMovements: "No hay movimientos registrados.",
    loadError: "No se pudieron cargar los movimientos y productos.",
    loadErrorRow: "No se pudieron cargar los movimientos. Usa Actualizar para intentarlo de nuevo.",
    newMovement: "Nuevo movimiento",
    editMovement: "Editar movimiento #{id}",
    chooseProduct: "Selecciona un producto",
    entry: "Entrada",
    exit: "Salida",
    termPlaceholder: "Compra, devolución…",
    inactive: "inactivo",
    referenceOptional: "Referencia (opcional)",
    deleteMovement: "¿Eliminar el movimiento #{id}?",
    deleteMovementAria: "Eliminar movimiento {id}",
    editMovementAria: "Editar movimiento {id}",
    createdMovement: "Movimiento creado correctamente.",
    updatedMovement: "Movimiento actualizado correctamente.",
    deletedMovement: "Movimiento eliminado correctamente.",
    saveError: "No se pudo guardar el movimiento.",
    deleteError: "No se pudo eliminar el movimiento.",
    noProducts: "Registra un producto antes de crear movimientos.",
    saving: "Guardando…",
  },
  en: {
    pageTitle: "Inventory movements | VetCare",
    preferences: "Preferences",
    managementNav: "Management",
    tableScroll: "Scrollable inventory movements table",
    eyebrow: "INVENTORY",
    heading: "Inventory movements",
    intro: "Record product receipts and issues.",
    navCompanies: "Companies",
    navInvoices: "Invoices",
    navPayments: "Payments",
    navMovements: "Movements",
    navProducts: "Products",
    navTerms: "Terms",
    navSchedules: "Schedules",
    listHeading: "Movement register",
    listHint: "This register does not calculate or change an aggregate stock balance.",
    addMovement: "New movement",
    tableCaption: "Registered inventory movements",
    id: "ID",
    date: "Date",
    product: "Product",
    type: "Type",
    quantity: "Quantity",
    term: "Term",
    reference: "Reference",
    actions: "Actions",
    loadingMovements: "Loading movements…",
    emptyMovements: "No movements are registered.",
    loadError: "Could not load movements and products.",
    loadErrorRow: "Could not load movements. Use Refresh to try again.",
    newMovement: "New movement",
    editMovement: "Edit movement #{id}",
    chooseProduct: "Choose a product",
    entry: "Receipt",
    exit: "Issue",
    termPlaceholder: "Purchase, return…",
    inactive: "inactive",
    referenceOptional: "Reference (optional)",
    deleteMovement: "Delete movement #{id}?",
    deleteMovementAria: "Delete movement {id}",
    editMovementAria: "Edit movement {id}",
    createdMovement: "Movement created successfully.",
    updatedMovement: "Movement updated successfully.",
    deletedMovement: "Movement deleted successfully.",
    saveError: "Could not save the movement.",
    deleteError: "Could not delete the movement.",
    noProducts: "Add a product before creating movements.",
    saving: "Saving…",
  },
};

const { t } = initPreferences(translations);
const tableBody = document.getElementById("movementsTableBody");
const message = document.getElementById("movementsMessage");
const dialog = document.getElementById("movementDialog");
const form = document.getElementById("movementForm");
const formMessage = document.getElementById("movementFormMessage");
const saveButton = document.getElementById("saveMovementBtn");
const addButton = document.getElementById("addMovementBtn");
let movements = [];
let products = [];
let editingId = null;
let loading = false;
let loadFailed = false;

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(
    document.documentElement.lang === "es" ? "es-CO" : "en-US",
    { dateStyle: "medium", timeStyle: "short" },
  ).format(date);
}

function renderMovements() {
  if (loading) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="8">${escapeHtml(t("loadingMovements"))}</td></tr>`;
    return;
  }
  if (loadFailed && !movements.length) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="8">${escapeHtml(t("loadErrorRow"))}</td></tr>`;
    return;
  }
  if (!movements.length) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="8">${escapeHtml(t("emptyMovements"))}</td></tr>`;
    return;
  }
  const productNames = new Map(products.map((product) => [
    Number(product.idProducto),
    product.producto,
  ]));

  tableBody.innerHTML = movements.map((movement) => {
    const incoming = String(movement.tipo).toLowerCase() === "entrada";
    return `
      <tr>
        <td>#${escapeHtml(movement.idMovimiento)}</td>
        <td>${escapeHtml(formatDate(movement.fecha))}</td>
        <td>${escapeHtml(productNames.get(Number(movement.idProducto)) || `#${movement.idProducto}`)}</td>
        <td><span class="badge ${incoming ? "badge-active" : "badge-inactive"}">${escapeHtml(t(incoming ? "entry" : "exit"))}</span></td>
        <td>${escapeHtml(movement.cantidad)}</td>
        <td>${escapeHtml(movement.termino)}</td>
        <td>${escapeHtml(movement.referencia || "—")}</td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn btn-warning" data-action="edit" data-id="${escapeHtml(movement.idMovimiento)}" aria-label="${escapeHtml(t("editMovementAria", { id: movement.idMovimiento }))}">${escapeHtml(t("edit"))}</button>
            <button type="button" class="btn btn-danger" data-action="delete" data-id="${escapeHtml(movement.idMovimiento)}" aria-label="${escapeHtml(t("deleteMovementAria", { id: movement.idMovimiento }))}">${escapeHtml(t("delete"))}</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderProductOptions(selectedId = null) {
  const select = form.elements.namedItem("idProducto");
  select.innerHTML = `
    <option value="">${escapeHtml(t("chooseProduct"))}</option>
    ${products.map((product) => `
      <option value="${escapeHtml(product.idProducto)}" ${Number(product.idProducto) === Number(selectedId) ? "selected" : ""}>${escapeHtml(product.producto)}${product.activo === false ? ` (${escapeHtml(t("inactive"))})` : ""}</option>
    `).join("")}
  `;
}

function openMovementDialog(movement = null) {
  hideMessage(formMessage);
  form.reset();
  editingId = movement?.idMovimiento ?? null;
  document.getElementById("movementDialogTitle").textContent = movement
    ? t("editMovement", { id: movement.idMovimiento })
    : t("newMovement");
  renderProductOptions(movement?.idProducto);
  form.elements.namedItem("tipo").value = movement?.tipo || "entrada";
  form.elements.namedItem("cantidad").value = movement?.cantidad ?? 1;
  form.elements.namedItem("termino").value = movement?.termino || "";
  form.elements.namedItem("referencia").value = movement?.referencia || "";
  dialog.showModal();
  form.elements.namedItem("idProducto").focus();
}

async function loadMovements() {
  loading = true;
  loadFailed = false;
  tableBody.setAttribute("aria-busy", "true");
  document.getElementById("reloadMovementsBtn").disabled = true;
  addButton.disabled = true;
  hideMessage(message);
  renderMovements();
  try {
    const [movementData, productData] = await Promise.all([
      movimientosService.list(),
      loadMovementOptions(),
    ]);
    if (!movementData || !productData) return false;
    movements = movementData;
    products = productData;
    loadFailed = false;
    addButton.disabled = products.length === 0;
    if (!products.length) showMessage(message, "error", t("noProducts"));
    return true;
  } catch (error) {
    loadFailed = true;
    showMessage(message, "error", error.message || t("loadError"));
    console.error("Error loading inventory movements:", error);
    return false;
  } finally {
    loading = false;
    tableBody.setAttribute("aria-busy", "false");
    document.getElementById("reloadMovementsBtn").disabled = false;
    addButton.disabled = products.length === 0;
    renderMovements();
  }
}

async function saveMovement(event) {
  event.preventDefault();
  hideMessage(formMessage);
  if (!form.reportValidity()) return;

  const payload = {
    idProducto: Number(form.elements.namedItem("idProducto").value),
    tipo: form.elements.namedItem("tipo").value,
    cantidad: Number(form.elements.namedItem("cantidad").value),
    termino: form.elements.namedItem("termino").value.trim(),
    referencia: form.elements.namedItem("referencia").value.trim() || null,
  };
  if (!payload.termino) {
    showMessage(formMessage, "error", t("requiredFields"));
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = t("saving");
  try {
    const result = await movimientosService.save(editingId, payload);
    if (!result) return;
    dialog.close();
    const saved = await loadMovements();
    if (saved) showMessage(message, "success", t(editingId ? "updatedMovement" : "createdMovement"));
  } catch (error) {
    showMessage(formMessage, "error", error.message || t("saveError"));
    console.error("Error saving inventory movement:", error);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = t("save");
  }
}

async function deleteMovement(id) {
  if (!window.confirm(t("deleteMovement", { id }))) return;
  hideMessage(message);
  try {
    const result = await movimientosService.remove(id);
    if (!result) return;
    const loaded = await loadMovements();
    if (loaded) showMessage(message, "success", t("deletedMovement"));
  } catch (error) {
    showMessage(message, "error", error.message || t("deleteError"));
    console.error("Error deleting inventory movement:", error);
  }
}

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const movement = movements.find((item) => Number(item.idMovimiento) === Number(button.dataset.id));
  if (!movement) return;
  if (button.dataset.action === "edit") openMovementDialog(movement);
  if (button.dataset.action === "delete") deleteMovement(movement.idMovimiento);
});

document.getElementById("reloadMovementsBtn").addEventListener("click", loadMovements);
document.getElementById("addMovementBtn").addEventListener("click", () => openMovementDialog());
document.getElementById("cancelMovementBtn").addEventListener("click", () => dialog.close());
document.getElementById("logoutBtn").addEventListener("click", logout);
form.addEventListener("submit", saveMovement);
window.addEventListener("vetcare:preferences", () => {
  hideMessage(message);
  renderMovements();
  if (dialog.open) {
    document.getElementById("movementDialogTitle").textContent = editingId
      ? t("editMovement", { id: editingId })
      : t("newMovement");
    renderProductOptions(form.elements.namedItem("idProducto").value);
  }
});

if (!getToken()) {
  logout();
} else {
  loadMovements();
}
