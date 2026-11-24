import {
  escapeHtml,
  formatCurrency,
  getToken,
  hideMessage,
  logout,
  showMessage,
} from "../common/api.js";
import { initPreferences } from "../common/preferences.js";
import { pagosService, loadPaymentOptions } from "./pagos-service.js";

const translations = {
  es: {
    pageTitle: "Pagos | VetCare",
    preferences: "Preferencias",
    managementNav: "Gestión",
    tableScroll: "Tabla de pagos desplazable",
    eyebrow: "FINANZAS",
    heading: "Pagos",
    intro: "Registra abonos y consulta pagos asociados a facturas.",
    navCompanies: "Compañías",
    navInvoices: "Facturas",
    navPayments: "Pagos",
    navMovements: "Movimientos",
    navProducts: "Productos",
    navTerms: "Términos",
    navSchedules: "Horarios",
    listHeading: "Registro de pagos",
    listHint: "El saldo disponible se calcula a partir de los pagos registrados.",
    addPayment: "Nuevo pago",
    tableCaption: "Pagos registrados",
    id: "ID",
    invoice: "Factura",
    method: "Método",
    amount: "Monto",
    date: "Fecha de pago",
    reference: "Referencia",
    actions: "Acciones",
    loadingPayments: "Cargando pagos…",
    emptyPayments: "No hay pagos registrados.",
    loadError: "No se pudieron cargar los pagos y las facturas.",
    loadErrorRow: "No se pudieron cargar los pagos. Usa Actualizar para intentarlo de nuevo.",
    newPayment: "Nuevo pago",
    editPayment: "Editar pago #{id}",
    chooseInvoice: "Selecciona una factura",
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    other: "Otro",
    referenceOptional: "Referencia (opcional)",
    balance: "Saldo disponible: {amount}",
    invoiceOption: "Factura #{id} · pendiente {balance} / total {total}",
    noBalance: "Esta factura ya está pagada por completo.",
    noInvoices: "Crea una factura antes de registrar un pago.",
    noOutstandingInvoices: "No hay facturas con saldo pendiente.",
    invalidAmount: "El monto debe ser positivo y no superar el saldo disponible.",
    deletePayment: "¿Eliminar el pago #{id}?",
    deletePaymentAria: "Eliminar pago {id}",
    editPaymentAria: "Editar pago {id}",
    createdPayment: "Pago creado correctamente.",
    updatedPayment: "Pago actualizado correctamente.",
    deletedPayment: "Pago eliminado correctamente.",
    saveError: "No se pudo guardar el pago.",
    deleteError: "No se pudo eliminar el pago.",
    saving: "Guardando…",
  },
  en: {
    pageTitle: "Payments | VetCare",
    preferences: "Preferences",
    managementNav: "Management",
    tableScroll: "Scrollable payments table",
    eyebrow: "FINANCE",
    heading: "Payments",
    intro: "Record installments and review payments linked to invoices.",
    navCompanies: "Companies",
    navInvoices: "Invoices",
    navPayments: "Payments",
    navMovements: "Movements",
    navProducts: "Products",
    navTerms: "Terms",
    navSchedules: "Schedules",
    listHeading: "Payment register",
    listHint: "Available balance is calculated from recorded payments.",
    addPayment: "New payment",
    tableCaption: "Registered payments",
    id: "ID",
    invoice: "Invoice",
    method: "Method",
    amount: "Amount",
    date: "Payment date",
    reference: "Reference",
    actions: "Actions",
    loadingPayments: "Loading payments…",
    emptyPayments: "No payments are registered.",
    loadError: "Could not load payments and invoices.",
    loadErrorRow: "Could not load payments. Use Refresh to try again.",
    newPayment: "New payment",
    editPayment: "Edit payment #{id}",
    chooseInvoice: "Choose an invoice",
    cash: "Cash",
    card: "Card",
    transfer: "Bank transfer",
    other: "Other",
    referenceOptional: "Reference (optional)",
    balance: "Available balance: {amount}",
    invoiceOption: "Invoice #{id} · due {balance} / total {total}",
    noBalance: "This invoice has been paid in full.",
    noInvoices: "Create an invoice before recording a payment.",
    noOutstandingInvoices: "There are no invoices with an outstanding balance.",
    invalidAmount: "Amount must be positive and no greater than the available balance.",
    deletePayment: "Delete payment #{id}?",
    deletePaymentAria: "Delete payment {id}",
    editPaymentAria: "Edit payment {id}",
    createdPayment: "Payment created successfully.",
    updatedPayment: "Payment updated successfully.",
    deletedPayment: "Payment deleted successfully.",
    saveError: "Could not save the payment.",
    deleteError: "Could not delete the payment.",
    saving: "Saving…",
  },
};

const preferences = initPreferences(translations);
const { t } = preferences;
const tableBody = document.getElementById("paymentsTableBody");
const message = document.getElementById("paymentsMessage");
const dialog = document.getElementById("paymentDialog");
const form = document.getElementById("paymentForm");
const formMessage = document.getElementById("paymentFormMessage");
const saveButton = document.getElementById("savePaymentBtn");
const addButton = document.getElementById("addPaymentBtn");
const invoiceSelect = form.elements.namedItem("idFactura");
const amountInput = form.elements.namedItem("monto");
let payments = [];
let invoices = [];
let editingId = null;
let loading = false;
let loadFailed = false;

function money(value) {
  return formatCurrency(value, preferences.locale);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(preferences.locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function paidAmount(invoiceId, exceptPaymentId = null) {
  return payments.reduce((sum, payment) => {
    if (Number(payment.idFactura) !== Number(invoiceId) ||
        Number(payment.idPago) === Number(exceptPaymentId)) return sum;
    return sum + Number(payment.monto || 0);
  }, 0);
}

function availableBalance(invoiceId, exceptPaymentId = null) {
  const invoice = invoices.find((item) => Number(item.idFactura) === Number(invoiceId));
  if (!invoice) return 0;
  return Math.max(0, Number(invoice.total) - paidAmount(invoiceId, exceptPaymentId));
}

function canCreatePayment() {
  return invoices.some((invoice) => availableBalance(invoice.idFactura) > 0);
}

function renderPayments() {
  if (loading) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="7">${escapeHtml(t("loadingPayments"))}</td></tr>`;
    return;
  }
  if (loadFailed && !payments.length) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="7">${escapeHtml(t("loadErrorRow"))}</td></tr>`;
    return;
  }
  if (!payments.length) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="7">${escapeHtml(t("emptyPayments"))}</td></tr>`;
    return;
  }
  tableBody.innerHTML = payments.map((payment) => `
    <tr>
      <td>#${escapeHtml(payment.idPago)}</td>
      <td>#${escapeHtml(payment.idFactura)}</td>
      <td>${escapeHtml(payment.metodoPago)}</td>
      <td><strong>${escapeHtml(money(payment.monto))}</strong></td>
      <td>${escapeHtml(formatDateTime(payment.fechaPago))}</td>
      <td>${escapeHtml(payment.referencia || "—")}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-warning" data-action="edit" data-id="${escapeHtml(payment.idPago)}" aria-label="${escapeHtml(t("editPaymentAria", { id: payment.idPago }))}">${escapeHtml(t("edit"))}</button>
          <button type="button" class="btn btn-danger" data-action="delete" data-id="${escapeHtml(payment.idPago)}" aria-label="${escapeHtml(t("deletePaymentAria", { id: payment.idPago }))}">${escapeHtml(t("delete"))}</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderInvoiceOptions(selectedId = null) {
  invoiceSelect.innerHTML = `
    <option value="">${escapeHtml(t("chooseInvoice"))}</option>
    ${invoices.map((invoice) => {
      const balance = availableBalance(invoice.idFactura, editingId);
      const currentInvoice = Number(invoice.idFactura) === Number(selectedId);
      const disabled = balance <= 0 && !currentInvoice ? "disabled" : "";
      return `<option value="${escapeHtml(invoice.idFactura)}" ${currentInvoice ? "selected" : ""} ${disabled}>${escapeHtml(t("invoiceOption", {
        id: invoice.idFactura,
        balance: money(balance),
        total: money(invoice.total),
      }))}</option>`;
    }).join("")}
  `;
}

function updateBalanceHint() {
  const invoiceId = invoiceSelect.value;
  const hint = document.getElementById("paymentBalance");
  if (!invoiceId) {
    hint.textContent = "";
    amountInput.removeAttribute("max");
    return;
  }
  const balance = availableBalance(invoiceId, editingId);
  hint.textContent = balance > 0
    ? t("balance", { amount: money(balance) })
    : t("noBalance");
  amountInput.max = String(balance);
}

function openPaymentDialog(payment = null) {
  hideMessage(formMessage);
  form.reset();
  editingId = payment?.idPago ?? null;
  document.getElementById("paymentDialogTitle").textContent = payment
    ? t("editPayment", { id: payment.idPago })
    : t("newPayment");
  renderInvoiceOptions(payment?.idFactura ?? null);
  const methodSelect = form.elements.namedItem("metodoPago");
  if (payment && !Array.from(methodSelect.options).some((option) => option.value === payment.metodoPago)) {
    const option = document.createElement("option");
    option.value = payment.metodoPago;
    option.textContent = payment.metodoPago;
    methodSelect.add(option);
  }
  methodSelect.value = payment?.metodoPago || "efectivo";
  amountInput.value = payment?.monto ?? "";
  form.elements.namedItem("referencia").value = payment?.referencia || "";
  updateBalanceHint();
  dialog.showModal();
  invoiceSelect.focus();
}

async function loadPayments() {
  loading = true;
  loadFailed = false;
  tableBody.setAttribute("aria-busy", "true");
  document.getElementById("reloadPaymentsBtn").disabled = true;
  addButton.disabled = true;
  hideMessage(message);
  renderPayments();

  try {
    const [paymentData, invoiceData] = await Promise.all([
      pagosService.list(),
      loadPaymentOptions(),
    ]);
    if (!paymentData || !invoiceData) return false;
    payments = paymentData;
    invoices = invoiceData;
    loadFailed = false;
    addButton.disabled = !canCreatePayment();
    if (!invoices.length) showMessage(message, "error", t("noInvoices"));
    else if (!canCreatePayment()) showMessage(message, "error", t("noOutstandingInvoices"));
    return true;
  } catch (error) {
    loadFailed = true;
    showMessage(message, "error", error.message || t("loadError"));
    console.error("Error loading payments:", error);
    return false;
  } finally {
    loading = false;
    tableBody.setAttribute("aria-busy", "false");
    document.getElementById("reloadPaymentsBtn").disabled = false;
    addButton.disabled = !canCreatePayment();
    renderPayments();
  }
}

async function savePayment(event) {
  event.preventDefault();
  hideMessage(formMessage);
  if (!form.reportValidity()) return;

  const idFactura = Number(invoiceSelect.value);
  const monto = Number(amountInput.value);
  const balance = availableBalance(idFactura, editingId);
  if (!Number.isFinite(monto) || monto <= 0 || monto > balance) {
    showMessage(formMessage, "error", t("invalidAmount"));
    return;
  }

  const payload = {
    idFactura,
    metodoPago: form.elements.namedItem("metodoPago").value,
    monto,
    referencia: form.elements.namedItem("referencia").value.trim() || null,
  };
  saveButton.disabled = true;
  saveButton.textContent = t("saving");
  try {
    const result = await pagosService.save(editingId, payload);
    if (!result) return;
    dialog.close();
    const saved = await loadPayments();
    if (saved) showMessage(message, "success", t(editingId ? "updatedPayment" : "createdPayment"));
  } catch (error) {
    showMessage(formMessage, "error", error.message || t("saveError"));
    console.error("Error saving payment:", error);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = t("save");
  }
}

async function deletePayment(id) {
  if (!window.confirm(t("deletePayment", { id }))) return;
  hideMessage(message);
  try {
    const result = await pagosService.remove(id);
    if (!result) return;
    const loaded = await loadPayments();
    if (loaded) showMessage(message, "success", t("deletedPayment"));
  } catch (error) {
    showMessage(message, "error", error.message || t("deleteError"));
    console.error("Error deleting payment:", error);
  }
}

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const payment = payments.find((item) => Number(item.idPago) === Number(button.dataset.id));
  if (!payment) return;
  if (button.dataset.action === "edit") openPaymentDialog(payment);
  if (button.dataset.action === "delete") deletePayment(payment.idPago);
});

invoiceSelect.addEventListener("change", updateBalanceHint);
document.getElementById("reloadPaymentsBtn").addEventListener("click", loadPayments);
document.getElementById("addPaymentBtn").addEventListener("click", () => openPaymentDialog());
document.getElementById("cancelPaymentBtn").addEventListener("click", () => dialog.close());
document.getElementById("logoutBtn").addEventListener("click", logout);
form.addEventListener("submit", savePayment);
window.addEventListener("vetcare:preferences", () => {
  hideMessage(message);
  renderPayments();
  if (dialog.open) {
    document.getElementById("paymentDialogTitle").textContent = editingId
      ? t("editPayment", { id: editingId })
      : t("newPayment");
    renderInvoiceOptions(invoiceSelect.value);
    updateBalanceHint();
  }
});

if (!getToken()) {
  logout();
} else {
  loadPayments();
}
