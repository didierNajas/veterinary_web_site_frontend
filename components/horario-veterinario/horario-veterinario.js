import { createCrudService, escapeHtml, getToken, hideMessage, logout, showMessage } from "../common/api.js";
import { initPreferences } from "../common/preferences.js";

const translations = {
  es: {
    pageTitle: "Horarios veterinarios | VetCare",
    eyebrow: "AGENDA",
    heading: "Horarios veterinarios",
    intro: "Programa la disponibilidad de los veterinarios por fecha y franja horaria.",
    preferences: "Preferencias",
    managementNav: "Gestión",
    tableScroll: "Tabla de horarios desplazable",
    navCompanies: "Compañías",
    navInvoices: "Facturas",
    navPayments: "Pagos",
    navMovements: "Movimientos",
    navProducts: "Productos",
    navTerms: "Términos",
    navSchedules: "Horarios",
    tableCaption: "Horarios registrados",
    listHeading: "Agenda de disponibilidad",
    listHint: "La hora de fin debe ser posterior a la hora de inicio.",
    refreshList: "Actualizar lista",
    newSchedule: "Nuevo horario",
    id: "ID",
    veterinarian: "Veterinario",
    date: "Fecha",
    startTime: "Hora de inicio",
    endTime: "Hora de fin",
    availability: "Disponibilidad",
    actions: "Acciones",
    loading: "Cargando horarios…",
    empty: "No hay horarios registrados.",
    loadError: "No se pudieron cargar los horarios.",
    loadErrorRow: "No se pudieron cargar los horarios. Usa Actualizar lista para intentarlo de nuevo.",
    editSchedule: "Editar horario",
    veterinarianId: "ID del veterinario",
    available: "Disponible",
    unavailable: "No disponible",
    saveSchedule: "Guardar horario",
    saving: "Guardando…",
    invalidTime: "La hora de fin debe ser posterior a la hora de inicio.",
    confirmDelete: "¿Eliminar el horario #{id}?",
    editAria: "Editar horario {id}",
    deleteAria: "Eliminar horario {id}",
    created: "Horario creado correctamente.",
    updated: "Horario actualizado correctamente.",
    deleted: "Horario eliminado correctamente.",
    saveError: "No se pudo guardar el horario.",
    deleteError: "No se pudo eliminar el horario.",
  },
  en: {
    pageTitle: "Veterinarian schedules | VetCare",
    eyebrow: "SCHEDULE",
    heading: "Veterinarian schedules",
    intro: "Set veterinarian availability by date and time range.",
    preferences: "Preferences",
    managementNav: "Management",
    tableScroll: "Scrollable veterinarian schedule table",
    navCompanies: "Companies",
    navInvoices: "Invoices",
    navPayments: "Payments",
    navMovements: "Movements",
    navProducts: "Products",
    navTerms: "Terms",
    navSchedules: "Schedules",
    tableCaption: "Registered schedules",
    listHeading: "Availability calendar",
    listHint: "The end time must be later than the start time.",
    refreshList: "Refresh list",
    newSchedule: "New schedule",
    id: "ID",
    veterinarian: "Veterinarian",
    date: "Date",
    startTime: "Start time",
    endTime: "End time",
    availability: "Availability",
    actions: "Actions",
    loading: "Loading schedules…",
    empty: "No schedules are registered.",
    loadError: "Could not load schedules.",
    loadErrorRow: "Could not load schedules. Use Refresh list to try again.",
    editSchedule: "Edit schedule",
    veterinarianId: "Veterinarian ID",
    available: "Available",
    unavailable: "Unavailable",
    saveSchedule: "Save schedule",
    saving: "Saving…",
    invalidTime: "The end time must be later than the start time.",
    confirmDelete: "Delete schedule #{id}?",
    editAria: "Edit schedule {id}",
    deleteAria: "Delete schedule {id}",
    created: "Schedule created successfully.",
    updated: "Schedule updated successfully.",
    deleted: "Schedule deleted successfully.",
    saveError: "Could not save the schedule.",
    deleteError: "Could not delete the schedule.",
  },
};

const { t } = initPreferences(translations);
const schedulesService = createCrudService("/horarios-veterinarios");
const tableBody = document.getElementById("horariosTableBody");
const message = document.getElementById("horarioMessage");
const dialog = document.getElementById("horarioDialog");
const form = document.getElementById("horarioForm");
const formMessage = document.getElementById("horarioFormMessage");
const saveButton = form.querySelector('[type="submit"]');
let horarios = [];
let editingId = null;
let loading = false;
let loadFailed = false;

function formatDate(date) {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat(
    document.documentElement.lang === "es" ? "es-CO" : "en-US",
  ).format(parsed);
}

function renderHorarios() {
  if (loading) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="7">${escapeHtml(t("loading"))}</td></tr>`;
    return;
  }
  if (loadFailed && !horarios.length) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="7">${escapeHtml(t("loadErrorRow"))}</td></tr>`;
    return;
  }
  if (!horarios.length) {
    tableBody.innerHTML = `<tr><td class="state-row" colspan="7">${escapeHtml(t("empty"))}</td></tr>`;
    return;
  }

  const orderedSchedules = [...horarios].sort((a, b) =>
    `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`)
  );
  tableBody.innerHTML = orderedSchedules.map((schedule) => `
    <tr>
      <td>#${escapeHtml(schedule.idHorario)}</td>
      <td>#${escapeHtml(schedule.idVeterinario)}</td>
      <td>${escapeHtml(formatDate(schedule.fecha))}</td>
      <td>${escapeHtml(String(schedule.horaInicio || "").slice(0, 5))}</td>
      <td>${escapeHtml(String(schedule.horaFin || "").slice(0, 5))}</td>
      <td><span class="badge ${schedule.disponible ? "badge-active" : "badge-inactive"}">${escapeHtml(t(schedule.disponible ? "available" : "unavailable"))}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-warning" data-action="edit" data-id="${escapeHtml(schedule.idHorario)}" aria-label="${escapeHtml(t("editAria", { id: schedule.idHorario }))}">${escapeHtml(t("edit"))}</button>
          <button type="button" class="btn btn-danger" data-action="delete" data-id="${escapeHtml(schedule.idHorario)}" aria-label="${escapeHtml(t("deleteAria", { id: schedule.idHorario }))}">${escapeHtml(t("delete"))}</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function loadHorarios() {
  loading = true;
  loadFailed = false;
  tableBody.setAttribute("aria-busy", "true");
  document.getElementById("reloadHorariosBtn").disabled = true;
  hideMessage(message);
  renderHorarios();
  try {
    const records = await schedulesService.list();
    if (!records) return false;
    horarios = records;
    loadFailed = false;
    return true;
  } catch (error) {
    loadFailed = true;
    showMessage(message, "error", error.message || t("loadError"));
    console.error("Error cargando horarios:", error);
    return false;
  } finally {
    loading = false;
    tableBody.setAttribute("aria-busy", "false");
    document.getElementById("reloadHorariosBtn").disabled = false;
    renderHorarios();
  }
}

function openDialog(schedule = null) {
  hideMessage(formMessage);
  form.reset();
  editingId = schedule?.idHorario ?? null;
  document.getElementById("horarioDialogTitle").textContent = schedule ? t("editSchedule") : t("newSchedule");
  if (schedule) {
    form.elements.namedItem("idVeterinario").value = schedule.idVeterinario;
    form.elements.namedItem("fecha").value = schedule.fecha;
    form.elements.namedItem("horaInicio").value = String(schedule.horaInicio || "").slice(0, 5);
    form.elements.namedItem("horaFin").value = String(schedule.horaFin || "").slice(0, 5);
    form.elements.namedItem("disponible").value = String(Boolean(schedule.disponible));
  } else {
    form.elements.namedItem("disponible").value = "true";
    const now = new Date();
    form.elements.namedItem("fecha").value = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  }
  dialog.showModal();
  form.elements.namedItem("idVeterinario").focus();
}

async function saveHorario(event) {
  event.preventDefault();
  hideMessage(formMessage);
  if (!form.reportValidity()) return;

  const horaInicio = form.elements.namedItem("horaInicio").value;
  const horaFin = form.elements.namedItem("horaFin").value;
  if (horaFin <= horaInicio) {
    showMessage(formMessage, "error", t("invalidTime"));
    return;
  }

  const payload = {
    idVeterinario: Number(form.elements.namedItem("idVeterinario").value),
    fecha: form.elements.namedItem("fecha").value,
    horaInicio,
    horaFin,
    disponible: form.elements.namedItem("disponible").value === "true",
  };
  const savedId = editingId;
  saveButton.disabled = true;
  saveButton.textContent = t("saving");
  try {
    const result = await schedulesService.save(savedId, payload);
    if (!result) return;
    dialog.close();
    const saved = await loadHorarios();
    if (saved) showMessage(message, "success", t(savedId ? "updated" : "created"));
  } catch (error) {
    showMessage(formMessage, "error", error.message || t("saveError"));
    console.error("Error guardando horario:", error);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = t("saveSchedule");
  }
}

async function deleteHorario(id) {
  if (!window.confirm(t("confirmDelete", { id }))) return;
  try {
    const result = await schedulesService.remove(id);
    if (!result) return;
    const loaded = await loadHorarios();
    if (loaded) showMessage(message, "success", t("deleted"));
  } catch (error) {
    showMessage(message, "error", error.message || t("deleteError"));
    console.error("Error eliminando horario:", error);
  }
}

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const schedule = horarios.find((item) => Number(item.idHorario) === Number(button.dataset.id));
  if (!schedule) return;
  if (button.dataset.action === "edit") openDialog(schedule);
  if (button.dataset.action === "delete") deleteHorario(schedule.idHorario);
});

document.getElementById("addHorarioBtn").addEventListener("click", () => openDialog());
document.getElementById("reloadHorariosBtn").addEventListener("click", loadHorarios);
document.getElementById("cancelHorarioBtn").addEventListener("click", () => dialog.close());
document.getElementById("logoutBtn").addEventListener("click", logout);
form.addEventListener("submit", saveHorario);
window.addEventListener("vetcare:preferences", () => {
  hideMessage(message);
  renderHorarios();
  if (dialog.open) {
    const schedule = horarios.find((item) => Number(item.idHorario) === Number(editingId));
    document.getElementById("horarioDialogTitle").textContent = schedule ? t("editSchedule") : t("newSchedule");
  }
});

if (!getToken()) {
  logout();
} else {
  loadHorarios();
}
