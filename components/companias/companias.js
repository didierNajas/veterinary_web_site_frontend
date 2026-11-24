import { escapeHtml, getToken, hideMessage, logout, showMessage } from "../common/api.js";
import { initPreferences } from "../common/preferences.js";
import { companiasService } from "./companias-service.js";

const translations = {
  es: {
    pageTitle: "Compañías | VetCare",
    preferences: "Preferencias",
    managementNav: "Gestión",
    tableScroll: "Tabla de compañías desplazable",
    eyebrow: "ADMINISTRACIÓN",
    heading: "Compañías",
    intro: "Administra los datos de las compañías asociadas.",
    navCompanies: "Compañías",
    navInvoices: "Facturas",
    navPayments: "Pagos",
    navMovements: "Movimientos",
    navProducts: "Productos",
    navTerms: "Términos",
    navSchedules: "Horarios",
    listHeading: "Directorio de compañías",
    listHint: "Datos de identificación y contacto.",
    addCompany: "Nueva compañía",
    tableCaption: "Compañías registradas",
    id: "ID",
    nit: "NIT",
    name: "Nombre",
    phone: "Teléfono",
    email: "Correo",
    address: "Dirección",
    loadingCompanies: "Cargando compañías…",
    emptyCompanies: "No hay compañías registradas.",
    loadError: "No se pudieron cargar las compañías.",
    loadErrorRow: "No se pudieron cargar las compañías. Usa Actualizar para intentarlo de nuevo.",
    newCompany: "Nueva compañía",
    editCompany: "Editar compañía",
    saving: "Guardando…",
    createdCompany: "Compañía creada correctamente.",
    updatedCompany: "Compañía actualizada correctamente.",
    deletedCompany: "Compañía eliminada correctamente.",
    deleteCompany: "¿Eliminar la compañía “{name}”? Las facturas conservarán su registro sin compañía asociada.",
    deleteCompanyAria: "Eliminar compañía {name}",
    editCompanyAria: "Editar compañía {name}",
    saveError: "No se pudo guardar la compañía.",
    deleteError: "No se pudo eliminar la compañía.",
  },
  en: {
    pageTitle: "Companies | VetCare",
    preferences: "Preferences",
    managementNav: "Management",
    tableScroll: "Scrollable company table",
    eyebrow: "ADMINISTRATION",
    heading: "Companies",
    intro: "Manage the details of associated companies.",
    navCompanies: "Companies",
    navInvoices: "Invoices",
    navPayments: "Payments",
    navMovements: "Movements",
    navProducts: "Products",
    navTerms: "Terms",
    navSchedules: "Schedules",
    listHeading: "Company directory",
    listHint: "Identification and contact information.",
    addCompany: "New company",
    tableCaption: "Registered companies",
    id: "ID",
    nit: "Tax ID",
    name: "Name",
    phone: "Phone",
    email: "Email",
    address: "Address",
    loadingCompanies: "Loading companies…",
    emptyCompanies: "No companies are registered.",
    loadError: "Could not load companies.",
    loadErrorRow: "Could not load companies. Use Refresh to try again.",
    newCompany: "New company",
    editCompany: "Edit company",
    saving: "Saving…",
    createdCompany: "Company created successfully.",
    updatedCompany: "Company updated successfully.",
    deletedCompany: "Company deleted successfully.",
    deleteCompany: "Delete company “{name}”? Invoices will remain without an associated company.",
    deleteCompanyAria: "Delete company {name}",
    editCompanyAria: "Edit company {name}",
    saveError: "Could not save the company.",
    deleteError: "Could not delete the company.",
  },
};

const { t } = initPreferences(translations);
const tableBody = document.getElementById("companiesTableBody");
const message = document.getElementById("companiesMessage");
const dialog = document.getElementById("companyDialog");
const form = document.getElementById("companyForm");
const formMessage = document.getElementById("companyFormMessage");
const saveButton = document.getElementById("saveCompanyBtn");
const addButton = document.getElementById("addCompanyBtn");
let companies = [];
let editingId = null;
let loading = false;
let loadFailed = false;

function renderCompanies() {
  if (loading) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="6">${escapeHtml(t("loadingCompanies"))}</td></tr>`;
    return;
  }
  if (loadFailed && !companies.length) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="6">${escapeHtml(t("loadErrorRow"))}</td></tr>`;
    return;
  }
  if (!companies.length) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="6">${escapeHtml(t("emptyCompanies"))}</td></tr>`;
    return;
  }

  tableBody.innerHTML = companies.map((company) => `
    <tr>
      <td>${escapeHtml(company.idCompania)}</td>
      <td>${escapeHtml(company.nit)}</td>
      <td>${escapeHtml(company.nombre)}</td>
      <td>${escapeHtml(company.telefono || "—")}</td>
      <td>${escapeHtml(company.correo || "—")}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-warning" data-action="edit" data-id="${escapeHtml(company.idCompania)}" aria-label="${escapeHtml(t("editCompanyAria", { name: company.nombre }))}">${escapeHtml(t("edit"))}</button>
          <button type="button" class="btn btn-danger" data-action="delete" data-id="${escapeHtml(company.idCompania)}" aria-label="${escapeHtml(t("deleteCompanyAria", { name: company.nombre }))}">${escapeHtml(t("delete"))}</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function loadCompanies() {
  loading = true;
  loadFailed = false;
  tableBody.setAttribute("aria-busy", "true");
  document.getElementById("reloadCompaniesBtn").disabled = true;
  addButton.disabled = true;
  hideMessage(message);
  renderCompanies();

  try {
    const result = await companiasService.list();
    if (!result) return false;
    companies = result;
    loadFailed = false;
    return true;
  } catch (error) {
    loadFailed = true;
    showMessage(message, "error", error.message || t("loadError"));
    console.error("Error loading companies:", error);
    return false;
  } finally {
    loading = false;
    tableBody.setAttribute("aria-busy", "false");
    document.getElementById("reloadCompaniesBtn").disabled = false;
    addButton.disabled = false;
    renderCompanies();
  }
}

function openCompanyDialog(company = null) {
  hideMessage(formMessage);
  form.reset();
  editingId = company?.idCompania ?? null;
  document.getElementById("companyDialogTitle").textContent = company ? t("editCompany") : t("newCompany");
  if (company) {
    for (const field of ["nit", "nombre", "direccion", "telefono", "correo"]) {
      form.elements.namedItem(field).value = company[field] || "";
    }
  }
  dialog.showModal();
  form.elements.namedItem("nit").focus();
}

async function saveCompany(event) {
  event.preventDefault();
  hideMessage(formMessage);
  if (!form.reportValidity()) return;

  const payload = {
    nit: form.elements.namedItem("nit").value.trim(),
    nombre: form.elements.namedItem("nombre").value.trim(),
    direccion: form.elements.namedItem("direccion").value.trim() || null,
    telefono: form.elements.namedItem("telefono").value.trim() || null,
    correo: form.elements.namedItem("correo").value.trim() || null,
  };
  if (!payload.nit || !payload.nombre) {
    showMessage(formMessage, "error", t("requiredFields"));
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = t("saving");
  try {
    const result = await companiasService.save(editingId, payload);
    if (!result) return;
    dialog.close();
    const saved = await loadCompanies();
    if (saved) showMessage(message, "success", t(editingId ? "updatedCompany" : "createdCompany"));
  } catch (error) {
    showMessage(formMessage, "error", error.message || t("saveError"));
    console.error("Error saving company:", error);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = t("save");
  }
}

async function deleteCompany(id) {
  const company = companies.find((item) => Number(item.idCompania) === Number(id));
  if (!company || !window.confirm(t("deleteCompany", { name: company.nombre }))) return;
  hideMessage(message);
  try {
    const result = await companiasService.remove(id);
    if (!result) return;
    const loaded = await loadCompanies();
    if (loaded) showMessage(message, "success", t("deletedCompany"));
  } catch (error) {
    showMessage(message, "error", error.message || t("deleteError"));
    console.error("Error deleting company:", error);
  }
}

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const company = companies.find((item) => Number(item.idCompania) === Number(button.dataset.id));
  if (!company) return;
  if (button.dataset.action === "edit") openCompanyDialog(company);
  if (button.dataset.action === "delete") deleteCompany(button.dataset.id);
});

document.getElementById("reloadCompaniesBtn").addEventListener("click", loadCompanies);
document.getElementById("cancelCompanyBtn").addEventListener("click", () => dialog.close());
document.getElementById("logoutBtn").addEventListener("click", logout);
addButton.addEventListener("click", () => openCompanyDialog());
form.addEventListener("submit", saveCompany);
window.addEventListener("vetcare:preferences", () => {
  hideMessage(message);
  renderCompanies();
  if (dialog.open) {
    const company = companies.find((item) => Number(item.idCompania) === Number(editingId));
    document.getElementById("companyDialogTitle").textContent = company ? t("editCompany") : t("newCompany");
  }
});

if (!getToken()) {
  logout();
} else {
  loadCompanies();
}
