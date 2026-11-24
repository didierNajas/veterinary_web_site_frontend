import {
  escapeHtml,
  formatCurrency,
  getToken,
  hideMessage,
  logout,
  showMessage,
} from "../common/api.js";
import { initPreferences } from "../common/preferences.js";
import { facturasService, loadInvoiceOptions } from "./facturas-service.js";

const translations = {
  es: {
    pageTitle: "Facturas | VetCare",
    preferences: "Preferencias",
    managementNav: "Gestión",
    tableScroll: "Tabla de facturas desplazable",
    eyebrow: "VENTAS",
    heading: "Facturas",
    intro: "Crea facturas con productos y detalle de impuestos.",
    navCompanies: "Compañías",
    navInvoices: "Facturas",
    navPayments: "Pagos",
    navMovements: "Movimientos",
    navProducts: "Productos",
    navTerms: "Términos",
    navSchedules: "Horarios",
    listHeading: "Registro de facturas",
    listHint: "El servidor calcula subtotales y total con los precios vigentes.",
    addInvoice: "Nueva factura",
    tableCaption: "Facturas registradas",
    id: "ID",
    date: "Fecha",
    user: "Usuario",
    company: "Compañía",
    items: "Productos",
    total: "Total",
    actions: "Acciones",
    loadingInvoices: "Cargando facturas…",
    emptyInvoices: "No hay facturas registradas.",
    loadError: "No se pudieron cargar las facturas y sus opciones.",
    loadErrorRow: "No se pudieron cargar las facturas. Usa Actualizar para intentarlo de nuevo.",
    newInvoice: "Nueva factura",
    editInvoice: "Editar factura #{id}",
    userId: "ID del usuario",
    companyOptional: "Compañía (opcional)",
    noCompany: "Sin compañía",
    term: "Término de factura",
    chooseTerm: "Selecciona un término",
    time: "Hora",
    taxPercent: "Impuesto (%)",
    invoiceLines: "Detalle de productos",
    priceHint: "El valor unitario se confirma en el servidor al guardar.",
    addLine: "Añadir producto",
    subtotal: "Subtotal estimado",
    tax: "Impuesto estimado",
    product: "Producto",
    quantity: "Cantidad",
    removeLine: "Quitar",
    productOption: "{name} · {price}",
    inactive: "inactivo",
    selectProduct: "Selecciona un producto",
    chooseProduct: "Selecciona un producto por cada línea.",
    duplicateProducts: "Un producto solo puede aparecer una vez; ajusta su cantidad en una sola línea.",
    missingOptions: "Se necesitan al menos un término y un producto activo para crear facturas.",
    deleteInvoice: "¿Eliminar la factura #{id}? No se puede eliminar si ya tiene pagos.",
    deleteInvoiceAria: "Eliminar factura {id}",
    editInvoiceAria: "Editar factura {id}",
    createdInvoice: "Factura creada correctamente.",
    updatedInvoice: "Factura actualizada correctamente.",
    deletedInvoice: "Factura eliminada correctamente.",
    saveError: "No se pudo guardar la factura.",
    deleteError: "No se pudo eliminar la factura.",
    saving: "Guardando…",
    productCount: "{count} producto(s)",
    createdAt: "Creada",
  },
  en: {
    pageTitle: "Invoices | VetCare",
    preferences: "Preferences",
    managementNav: "Management",
    tableScroll: "Scrollable invoice table",
    eyebrow: "SALES",
    heading: "Invoices",
    intro: "Create invoices with products and tax details.",
    navCompanies: "Companies",
    navInvoices: "Invoices",
    navPayments: "Payments",
    navMovements: "Movements",
    navProducts: "Products",
    navTerms: "Terms",
    navSchedules: "Schedules",
    listHeading: "Invoice register",
    listHint: "The server calculates subtotals and totals using current prices.",
    addInvoice: "New invoice",
    tableCaption: "Registered invoices",
    id: "ID",
    date: "Date",
    user: "User",
    company: "Company",
    items: "Products",
    total: "Total",
    actions: "Actions",
    loadingInvoices: "Loading invoices…",
    emptyInvoices: "No invoices are registered.",
    loadError: "Could not load invoices and their options.",
    loadErrorRow: "Could not load invoices. Use Refresh to try again.",
    newInvoice: "New invoice",
    editInvoice: "Edit invoice #{id}",
    userId: "User ID",
    companyOptional: "Company (optional)",
    noCompany: "No company",
    term: "Invoice term",
    chooseTerm: "Choose a term",
    time: "Time",
    taxPercent: "Tax (%)",
    invoiceLines: "Product details",
    priceHint: "The unit price is confirmed by the server when saved.",
    addLine: "Add product",
    subtotal: "Estimated subtotal",
    tax: "Estimated tax",
    product: "Product",
    quantity: "Quantity",
    removeLine: "Remove",
    productOption: "{name} · {price}",
    inactive: "inactive",
    selectProduct: "Choose a product",
    chooseProduct: "Choose a product for every line.",
    duplicateProducts: "A product can only appear once; adjust its quantity on a single line.",
    missingOptions: "At least one term and one active product are required to create invoices.",
    deleteInvoice: "Delete invoice #{id}? Invoices with payments cannot be deleted.",
    deleteInvoiceAria: "Delete invoice {id}",
    editInvoiceAria: "Edit invoice {id}",
    createdInvoice: "Invoice created successfully.",
    updatedInvoice: "Invoice updated successfully.",
    deletedInvoice: "Invoice deleted successfully.",
    saveError: "Could not save the invoice.",
    deleteError: "Could not delete the invoice.",
    saving: "Saving…",
    productCount: "{count} product(s)",
    createdAt: "Created",
  },
};

const preferences = initPreferences(translations);
const { t } = preferences;
const tableBody = document.getElementById("invoicesTableBody");
const message = document.getElementById("invoicesMessage");
const dialog = document.getElementById("invoiceDialog");
const form = document.getElementById("invoiceForm");
const formMessage = document.getElementById("invoiceFormMessage");
const linesContainer = document.getElementById("invoiceLines");
const linesError = document.getElementById("invoiceLinesError");
const saveButton = document.getElementById("saveInvoiceBtn");
const addButton = document.getElementById("addInvoiceBtn");

let invoices = [];
let companies = [];
let terms = [];
let products = [];
let currentUser = null;
let draftLines = [];
let editingId = null;
let loading = false;
let loadFailed = false;

function localDateTimeDefaults() {
  const now = new Date();
  const date = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return {
    date: date.toISOString().slice(0, 10),
    time: date.toISOString().slice(11, 16),
  };
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(preferences.locale).format(date);
}

function money(value) {
  return formatCurrency(value, preferences.locale);
}

function renderInvoices() {
  if (loading) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="7">${escapeHtml(t("loadingInvoices"))}</td></tr>`;
    return;
  }
  if (loadFailed && !invoices.length) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="7">${escapeHtml(t("loadErrorRow"))}</td></tr>`;
    return;
  }
  if (!invoices.length) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="7">${escapeHtml(t("emptyInvoices"))}</td></tr>`;
    return;
  }

  const companyNames = new Map(companies.map((company) => [
    Number(company.idCompania),
    company.nombre,
  ]));
  tableBody.innerHTML = invoices.map((invoice) => {
    const details = Array.isArray(invoice.detalles) ? invoice.detalles : [];
    const itemSummary = details.map((detail) =>
      `${escapeHtml(detail.producto || `#${detail.idProducto}`)} × ${escapeHtml(detail.cantidad)}`
    ).join(", ");
    return `
      <tr>
        <td>#${escapeHtml(invoice.idFactura)}</td>
        <td>${escapeHtml(formatDate(invoice.fecha))}<br><span class="hint">${escapeHtml(String(invoice.hora || "").slice(0, 5))}</span></td>
        <td>#${escapeHtml(invoice.idUsuario)}</td>
        <td>${escapeHtml(companyNames.get(Number(invoice.idCompania)) || (invoice.idCompania ? `#${invoice.idCompania}` : "—"))}</td>
        <td>${itemSummary || "—"}</td>
        <td><strong>${escapeHtml(money(invoice.total))}</strong></td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn btn-warning" data-action="edit" data-id="${escapeHtml(invoice.idFactura)}" aria-label="${escapeHtml(t("editInvoiceAria", { id: invoice.idFactura }))}">${escapeHtml(t("edit"))}</button>
            <button type="button" class="btn btn-danger" data-action="delete" data-id="${escapeHtml(invoice.idFactura)}" aria-label="${escapeHtml(t("deleteInvoiceAria", { id: invoice.idFactura }))}">${escapeHtml(t("delete"))}</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderOptions(select, items, idKey, label, selectedId, emptyLabel) {
  select.innerHTML = `
    <option value="">${escapeHtml(emptyLabel)}</option>
    ${items.map((item) => `
      <option value="${escapeHtml(item[idKey])}" ${Number(item[idKey]) === Number(selectedId) ? "selected" : ""}>${escapeHtml(label(item))}</option>
    `).join("")}
  `;
}

function renderFormOptions(selectedCompany = null, selectedTerm = null) {
  const companySelect = form.elements.namedItem("idCompania");
  companySelect.innerHTML = `
    <option value="">${escapeHtml(t("noCompany"))}</option>
    ${companies.map((company) => `
      <option value="${escapeHtml(company.idCompania)}" ${Number(company.idCompania) === Number(selectedCompany) ? "selected" : ""}>${escapeHtml(company.nombre)}</option>
    `).join("")}
  `;
  renderOptions(
    form.elements.namedItem("idTermino"),
    terms,
    "idTermino",
    (term) => term.termino,
    selectedTerm,
    t("chooseTerm"),
  );
}

function activeProductOptions(selectedProductId) {
  return products.filter((product) =>
    product.activo !== false || Number(product.idProducto) === Number(selectedProductId)
  );
}

function renderInvoiceLines() {
  linesContainer.innerHTML = draftLines.map((line, index) => {
    const options = activeProductOptions(line.idProducto);
    const productsOptions = options.map((product) => {
      const inactiveLabel = product.activo === false ? ` (${t("inactive")})` : "";
      const productLabel = t("productOption", {
        name: `${product.producto}${inactiveLabel}`,
        price: money(product.valorUnitarioVenta),
      });
      return `<option value="${escapeHtml(product.idProducto)}" ${Number(product.idProducto) === Number(line.idProducto) ? "selected" : ""}>${escapeHtml(productLabel)}</option>`;
    }).join("");

    return `
      <div class="line-item" data-index="${index}">
        <label>
          <span>${escapeHtml(t("product"))}</span>
          <select data-line-field="idProducto" aria-label="${escapeHtml(t("product"))} ${index + 1}" required>
            <option value="">${escapeHtml(t("selectProduct"))}</option>
            ${productsOptions}
          </select>
        </label>
        <label>
          <span>${escapeHtml(t("quantity"))}</span>
          <input data-line-field="cantidad" type="number" min="1" max="32767" step="1" value="${escapeHtml(line.cantidad || 1)}" aria-label="${escapeHtml(t("quantity"))} ${index + 1}" required>
        </label>
        <button type="button" class="btn btn-danger remove-line" data-action="remove-line" data-index="${index}" ${draftLines.length === 1 ? "disabled" : ""}>${escapeHtml(t("removeLine"))}</button>
      </div>
    `;
  }).join("");
  renderEstimatedTotals();
}

function renderEstimatedTotals() {
  const subtotalCents = draftLines.reduce((sum, line) => {
    const product = products.find((item) => Number(item.idProducto) === Number(line.idProducto));
    const unitCents = Math.round(Number(product?.valorUnitarioVenta || 0) * 100);
    const quantity = Number(line.cantidad) || 0;
    return sum + unitCents * quantity;
  }, 0);
  const taxRate = (Number(form.elements.namedItem("tasaImpuesto").value) || 0) / 100;
  const taxCents = Math.round(subtotalCents * taxRate);
  document.getElementById("invoiceSubtotal").textContent = money(subtotalCents / 100);
  document.getElementById("invoiceTax").textContent = money(taxCents / 100);
  document.getElementById("invoiceTotal").textContent = money((subtotalCents + taxCents) / 100);
}

function openInvoiceDialog(invoice = null) {
  hideMessage(formMessage);
  linesError.hidden = true;
  form.reset();
  editingId = invoice?.idFactura ?? null;
  document.getElementById("invoiceDialogTitle").textContent = invoice
    ? t("editInvoice", { id: invoice.idFactura })
    : t("newInvoice");
  const defaults = localDateTimeDefaults();
  form.elements.namedItem("idUsuario").value = invoice?.idUsuario ?? currentUser?.id ?? "";
  form.elements.namedItem("fecha").value = invoice?.fecha || defaults.date;
  form.elements.namedItem("hora").value = String(invoice?.hora || defaults.time).slice(0, 5);
  form.elements.namedItem("tasaImpuesto").value = invoice
    ? (Number(invoice.tasaImpuesto) * 100).toFixed(2)
    : "19";
  renderFormOptions(invoice?.idCompania, invoice?.idTermino);
  draftLines = invoice?.detalles?.length
    ? invoice.detalles.map((detail) => ({
      idProducto: detail.idProducto,
      cantidad: detail.cantidad,
    }))
    : [{ idProducto: "", cantidad: 1 }];
  renderInvoiceLines();
  dialog.showModal();
  form.elements.namedItem("idUsuario").focus();
}

function validateLines() {
  const selectedIds = draftLines.map((line) => Number(line.idProducto));
  if (selectedIds.some((id) => !id)) {
    linesError.textContent = t("chooseProduct");
    linesError.hidden = false;
    return false;
  }
  if (new Set(selectedIds).size !== selectedIds.length) {
    linesError.textContent = t("duplicateProducts");
    linesError.hidden = false;
    return false;
  }
  linesError.hidden = true;
  return true;
}

async function loadInvoices() {
  loading = true;
  loadFailed = false;
  tableBody.setAttribute("aria-busy", "true");
  document.getElementById("reloadInvoicesBtn").disabled = true;
  addButton.disabled = true;
  hideMessage(message);
  renderInvoices();

  try {
    const [invoiceData, optionData] = await Promise.all([
      facturasService.list(),
      loadInvoiceOptions(),
    ]);
    if (!invoiceData || optionData.some((item) => !item)) return false;
    [currentUser, companies, terms, products] = optionData;
    invoices = invoiceData;
    loadFailed = false;
    addButton.disabled = !terms.length || !products.some((product) => product.activo !== false);
    if (addButton.disabled) showMessage(message, "error", t("missingOptions"));
    return true;
  } catch (error) {
    loadFailed = true;
    showMessage(message, "error", error.message || t("loadError"));
    console.error("Error loading invoices:", error);
    return false;
  } finally {
    loading = false;
    tableBody.setAttribute("aria-busy", "false");
    document.getElementById("reloadInvoicesBtn").disabled = false;
    addButton.disabled = !terms.length || !products.some((product) => product.activo !== false);
    renderInvoices();
  }
}

async function saveInvoice(event) {
  event.preventDefault();
  hideMessage(formMessage);
  if (!form.reportValidity() || !validateLines()) return;

  const taxPercent = Number(form.elements.namedItem("tasaImpuesto").value);
  if (taxPercent < 0 || taxPercent > 100) {
    showMessage(formMessage, "error", t("requiredFields"));
    return;
  }

  const payload = {
    idUsuario: Number(form.elements.namedItem("idUsuario").value),
    idCompania: form.elements.namedItem("idCompania").value
      ? Number(form.elements.namedItem("idCompania").value)
      : null,
    idTermino: Number(form.elements.namedItem("idTermino").value),
    fecha: form.elements.namedItem("fecha").value,
    hora: form.elements.namedItem("hora").value,
    tasaImpuesto: Number((taxPercent / 100).toFixed(4)),
    detalles: draftLines.map((line) => ({
      idProducto: Number(line.idProducto),
      cantidad: Number(line.cantidad),
    })),
  };

  saveButton.disabled = true;
  saveButton.textContent = t("saving");
  try {
    const result = await facturasService.save(editingId, payload);
    if (!result) return;
    dialog.close();
    const saved = await loadInvoices();
    if (saved) showMessage(message, "success", t(editingId ? "updatedInvoice" : "createdInvoice"));
  } catch (error) {
    showMessage(formMessage, "error", error.message || t("saveError"));
    console.error("Error saving invoice:", error);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = t("save");
  }
}

async function deleteInvoice(id) {
  if (!window.confirm(t("deleteInvoice", { id }))) return;
  hideMessage(message);
  try {
    const result = await facturasService.remove(id);
    if (!result) return;
    const loaded = await loadInvoices();
    if (loaded) showMessage(message, "success", t("deletedInvoice"));
  } catch (error) {
    showMessage(message, "error", error.message || t("deleteError"));
    console.error("Error deleting invoice:", error);
  }
}

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const invoice = invoices.find((item) => Number(item.idFactura) === Number(button.dataset.id));
  if (!invoice) return;
  if (button.dataset.action === "edit") openInvoiceDialog(invoice);
  if (button.dataset.action === "delete") deleteInvoice(invoice.idFactura);
});

linesContainer.addEventListener("change", (event) => {
  const field = event.target.dataset.lineField;
  if (!field) return;
  const line = draftLines[Number(event.target.closest(".line-item").dataset.index)];
  line[field] = field === "cantidad" ? Number(event.target.value) : event.target.value;
  if (field === "idProducto") renderInvoiceLines();
  else renderEstimatedTotals();
  linesError.hidden = true;
});

linesContainer.addEventListener("input", (event) => {
  if (event.target.dataset.lineField !== "cantidad") return;
  const index = Number(event.target.closest(".line-item").dataset.index);
  draftLines[index].cantidad = Number(event.target.value);
  renderEstimatedTotals();
});

linesContainer.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="remove-line"]');
  if (!button || draftLines.length <= 1) return;
  draftLines.splice(Number(button.dataset.index), 1);
  renderInvoiceLines();
});

form.elements.namedItem("tasaImpuesto").addEventListener("input", renderEstimatedTotals);
document.getElementById("addInvoiceLineBtn").addEventListener("click", () => {
  draftLines.push({ idProducto: "", cantidad: 1 });
  renderInvoiceLines();
});
document.getElementById("reloadInvoicesBtn").addEventListener("click", loadInvoices);
document.getElementById("addInvoiceBtn").addEventListener("click", () => openInvoiceDialog());
document.getElementById("cancelInvoiceBtn").addEventListener("click", () => dialog.close());
document.getElementById("logoutBtn").addEventListener("click", logout);
form.addEventListener("submit", saveInvoice);
window.addEventListener("vetcare:preferences", () => {
  hideMessage(message);
  renderInvoices();
  if (dialog.open) {
    document.getElementById("invoiceDialogTitle").textContent = editingId
      ? t("editInvoice", { id: editingId })
      : t("newInvoice");
    renderInvoiceLines();
  }
});

if (!getToken()) {
  logout();
} else {
  loadInvoices();
}
