import { createCrudService, escapeHtml, getToken, hideMessage, logout, showMessage } from "../common/api.js";
import { initPreferences } from "../common/preferences.js";

const translations = {
  es: {
    pageTitle: "Términos de inventario | VetCare",
    eyebrow: "CATÁLOGO",
    heading: "Términos de inventario",
    intro: "Administra las etiquetas disponibles para las facturas y movimientos.",
    preferences: "Preferencias",
    managementNav: "Gestión",
    tableScroll: "Tabla de términos desplazable",
    navCompanies: "Compañías",
    navInvoices: "Facturas",
    navPayments: "Pagos",
    navMovements: "Movimientos",
    navProducts: "Productos",
    navTerms: "Términos",
    navSchedules: "Horarios",
    tableCaption: "Términos registrados",
    listHeading: "Términos de inventario",
    listHint: "Crea, consulta y actualiza los términos.",
    refreshList: "Actualizar lista",
    newTerm: "Nuevo término",
    id: "ID",
    term: "Término",
    actions: "Acciones",
    loading: "Cargando términos…",
    empty: "No hay términos registrados.",
    loadError: "No se pudo cargar el inventario.",
    loadErrorRow: "No se pudieron cargar los términos. Usa Actualizar lista para intentarlo de nuevo.",
    editTerm: "Editar término",
    saveTerm: "Guardar término",
    saving: "Guardando…",
    cancel: "Cancelar",
    created: "Término creado correctamente.",
    updated: "Término actualizado correctamente.",
    deleted: "Término eliminado correctamente.",
    confirmDelete: "¿Eliminar el término “{term}”?",
    editAria: "Editar término {term}",
    deleteAria: "Eliminar término {term}",
    saveError: "No se pudo guardar el término.",
    deleteError: "No se pudo eliminar el término.",
  },
  en: {
    pageTitle: "Inventory terms | VetCare",
    eyebrow: "CATALOG",
    heading: "Inventory terms",
    intro: "Manage the labels available for invoices and movements.",
    preferences: "Preferences",
    managementNav: "Management",
    tableScroll: "Scrollable inventory terms table",
    navCompanies: "Companies",
    navInvoices: "Invoices",
    navPayments: "Payments",
    navMovements: "Movements",
    navProducts: "Products",
    navTerms: "Terms",
    navSchedules: "Schedules",
    tableCaption: "Registered terms",
    listHeading: "Inventory terms",
    listHint: "Create, review, and update terms.",
    refreshList: "Refresh list",
    newTerm: "New term",
    id: "ID",
    term: "Term",
    actions: "Actions",
    loading: "Loading terms…",
    empty: "No inventory terms are registered.",
    loadError: "Could not load inventory terms.",
    loadErrorRow: "Could not load terms. Use Refresh list to try again.",
    editTerm: "Edit term",
    saveTerm: "Save term",
    saving: "Saving…",
    cancel: "Cancel",
    created: "Term created successfully.",
    updated: "Term updated successfully.",
    deleted: "Term deleted successfully.",
    confirmDelete: "Delete term “{term}”?",
    editAria: "Edit term {term}",
    deleteAria: "Delete term {term}",
    saveError: "Could not save the term.",
    deleteError: "Could not delete the term.",
  },
};

const { t } = initPreferences(translations);
const termsService = createCrudService("/inventario");
const tableBody = document.getElementById("inventarioTableBody");
const message = document.getElementById("inventarioMessage");
const dialog = document.getElementById("terminoDialog");
const form = document.getElementById("terminoForm");
const formMessage = document.getElementById("terminoFormMessage");
const saveButton = form.querySelector('[type="submit"]');

let terminos = [];
let editingId = null;
let loading = false;
let loadFailed = false;

async function loadInventario() {
  loading = true;
  loadFailed = false;
  tableBody.setAttribute("aria-busy", "true");
  document.getElementById("reloadInventarioBtn").disabled = true;
  hideMessage(message);
  renderInventario();
  try {
    const records = await termsService.list();
    if (!records) return false;
    terminos = records;
    loadFailed = false;
    return true;
  } catch (error) {
    loadFailed = true;
    showMessage(message, "error", error.message || t("loadError"));
    console.error("Error cargando inventario:", error);
    return false;
  } finally {
    loading = false;
    tableBody.setAttribute("aria-busy", "false");
    document.getElementById("reloadInventarioBtn").disabled = false;
    renderInventario();
  }
}

function renderInventario() {
  if (loading) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="3">${escapeHtml(t("loading"))}</td></tr>`;
    return;
  }
  if (loadFailed && !terminos.length) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="3">${escapeHtml(t("loadErrorRow"))}</td></tr>`;
    return;
  }
  if (!terminos.length) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="3">${escapeHtml(t("empty"))}</td></tr>`;
    return;
  }

  tableBody.innerHTML = terminos.map((item) => `
    <tr>
      <td>${escapeHtml(item.idTermino)}</td>
      <td>${escapeHtml(item.termino)}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-warning" data-action="edit" data-id="${escapeHtml(item.idTermino)}" aria-label="${escapeHtml(t("editAria", { term: item.termino }))}">${escapeHtml(t("edit"))}</button>
          <button type="button" class="btn btn-danger" data-action="delete" data-id="${escapeHtml(item.idTermino)}" aria-label="${escapeHtml(t("deleteAria", { term: item.termino }))}">${escapeHtml(t("delete"))}</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function openDialog(item = null) {
  hideMessage(formMessage);
  form.reset();
  editingId = item?.idTermino ?? null;
  document.getElementById("terminoDialogTitle").textContent = item ? t("editTerm") : t("newTerm");
  if (item) form.elements.namedItem("termino").value = item.termino || "";
  dialog.showModal();
  form.elements.namedItem("termino").focus();
}

async function saveTermino(event) {
  event.preventDefault();
  hideMessage(formMessage);
  if (!form.reportValidity()) return;

  const payload = { termino: form.elements.namedItem("termino").value.trim() };
  if (!payload.termino) return;
  const savedId = editingId;
  saveButton.disabled = true;
  saveButton.textContent = t("saving");
  try {
    const result = await termsService.save(savedId, payload);
    if (!result) return;
    dialog.close();
    const saved = await loadInventario();
    if (saved) showMessage(message, "success", t(savedId ? "updated" : "created"));
  } catch (error) {
    showMessage(formMessage, "error", error.message || t("saveError"));
    console.error("Error guardando término:", error);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = t("saveTerm");
  }
}

async function deleteTermino(id) {
  const item = terminos.find((termino) => Number(termino.idTermino) === Number(id));
  if (!item || !window.confirm(t("confirmDelete", { term: item.termino }))) return;
  try {
    const result = await termsService.remove(id);
    if (!result) return;
    const loaded = await loadInventario();
    if (loaded) showMessage(message, "success", t("deleted"));
  } catch (error) {
    showMessage(message, "error", error.message || t("deleteError"));
    console.error("Error eliminando término:", error);
  }
}

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const item = terminos.find((termino) => Number(termino.idTermino) === Number(button.dataset.id));
  if (!item) return;
  if (button.dataset.action === "edit") openDialog(item);
  if (button.dataset.action === "delete") deleteTermino(button.dataset.id);
});

document.getElementById("addTerminoBtn").addEventListener("click", () => openDialog());
document.getElementById("reloadInventarioBtn").addEventListener("click", loadInventario);
document.getElementById("cancelTerminoBtn").addEventListener("click", () => dialog.close());
document.getElementById("logoutBtn").addEventListener("click", logout);
form.addEventListener("submit", saveTermino);
window.addEventListener("vetcare:preferences", () => {
  hideMessage(message);
  renderInventario();
  if (dialog.open) {
    const editingTerm = terminos.find((item) => Number(item.idTermino) === Number(editingId));
    document.getElementById("terminoDialogTitle").textContent = editingTerm ? t("editTerm") : t("newTerm");
  }
});

if (!getToken()) {
  logout();
} else {
  loadInventario();
}
