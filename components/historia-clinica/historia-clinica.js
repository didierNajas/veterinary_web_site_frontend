import {
  apiRequest,
  authHeaders,
  escapeHtml,
  getToken,
  hideMessage,
  logout,
  responseError,
  showMessage,
} from "../common/api.js";

const historiasTableBody = document.getElementById("historiasTableBody");
const historiaMessage = document.getElementById("historiaMessage");
const historiaDialog = document.getElementById("historiaDialog");
const historiaForm = document.getElementById("historiaForm");
const historiaFormMessage = document.getElementById("historiaFormMessage");

let historias = [];
let editingId = null;

async function loadHistorias() {
  hideMessage(historiaMessage);
  historiasTableBody.innerHTML = `<tr><td colspan="7">Cargando historias clínicas...</td></tr>`;

  try {
    const response = await apiRequest("/historias-clinicas", { headers: authHeaders() });
    if (!response) return false;
    if (!response.ok) throw new Error(await responseError(response));

    historias = await response.json();
    renderHistorias();
    return true;
  } catch (error) {
    historiasTableBody.innerHTML = `<tr><td colspan="7">No se pudieron cargar las historias clínicas.</td></tr>`;
    showMessage(historiaMessage, "error", error.message || "No se pudieron cargar las historias clínicas.");
    console.error("Error cargando historias clínicas:", error);
    return false;
  }
}

function renderHistorias() {
  if (!historias.length) {
    historiasTableBody.innerHTML = `<tr><td colspan="7">No hay historias clínicas registradas.</td></tr>`;
    return;
  }

  historiasTableBody.innerHTML = historias.map((historia) => `
    <tr>
      <td>${escapeHtml(historia.idHistoria)}</td>
      <td>${escapeHtml(historia.idCita)}</td>
      <td>${escapeHtml(historia.diagnostico || "—")}</td>
      <td>${escapeHtml(historia.tratamiento || "—")}</td>
      <td>${escapeHtml(historia.observaciones || "—")}</td>
      <td>${escapeHtml(new Date(historia.fechaRegistro).toLocaleString("es-CO"))}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-warning" data-action="edit" data-id="${escapeHtml(historia.idHistoria)}">Editar</button>
          <button type="button" class="btn btn-danger" data-action="delete" data-id="${escapeHtml(historia.idHistoria)}">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function openHistoriaDialog(historia = null) {
  hideMessage(historiaFormMessage);
  historiaForm.reset();
  editingId = historia ? historia.idHistoria : null;
  document.getElementById("historiaDialogTitle").textContent = historia ? "Editar historia clínica" : "Nueva historia clínica";

  if (historia) {
    historiaForm.elements.namedItem("idCita").value = historia.idCita;
    historiaForm.elements.namedItem("diagnostico").value = historia.diagnostico || "";
    historiaForm.elements.namedItem("tratamiento").value = historia.tratamiento || "";
    historiaForm.elements.namedItem("observaciones").value = historia.observaciones || "";
  }

  historiaDialog.showModal();
}

async function saveHistoria(event) {
  event.preventDefault();
  hideMessage(historiaFormMessage);

  const payload = {
    idCita: Number(historiaForm.elements.namedItem("idCita").value),
    diagnostico: historiaForm.elements.namedItem("diagnostico").value.trim() || null,
    tratamiento: historiaForm.elements.namedItem("tratamiento").value.trim() || null,
    observaciones: historiaForm.elements.namedItem("observaciones").value.trim() || null,
  };
  const path = editingId ? `/historias-clinicas/${editingId}` : "/historias-clinicas";

  try {
    const response = await apiRequest(path, {
      method: editingId ? "PUT" : "POST",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    });
    if (!response) return;
    if (!response.ok) {
      showMessage(historiaFormMessage, "error", await responseError(response));
      return;
    }

    historiaDialog.close();
    const loaded = await loadHistorias();
    if (loaded) showMessage(historiaMessage, "success", editingId
      ? "Historia clínica actualizada correctamente."
      : "Historia clínica creada correctamente.");
  } catch (error) {
    showMessage(historiaFormMessage, "error", "No se pudo guardar la historia clínica.");
    console.error("Error guardando historia clínica:", error);
  }
}

async function deleteHistoria(id) {
  const historia = historias.find((item) => Number(item.idHistoria) === Number(id));
  if (!historia || !window.confirm(`¿Eliminar la historia clínica #${id}?`)) return;

  try {
    const response = await apiRequest(`/historias-clinicas/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!response) return;
    if (!response.ok) {
      showMessage(historiaMessage, "error", await responseError(response));
      return;
    }

    const loaded = await loadHistorias();
    if (loaded) showMessage(historiaMessage, "success", "Historia clínica eliminada correctamente.");
  } catch (error) {
    showMessage(historiaMessage, "error", "No se pudo eliminar la historia clínica.");
    console.error("Error eliminando historia clínica:", error);
  }
}

historiasTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  if (button.dataset.action === "edit") {
    const historia = historias.find((item) => Number(item.idHistoria) === Number(button.dataset.id));
    if (historia) openHistoriaDialog(historia);
  } else if (button.dataset.action === "delete") {
    deleteHistoria(button.dataset.id);
  }
});

document.getElementById("addHistoriaBtn").addEventListener("click", () => openHistoriaDialog());
document.getElementById("reloadHistoriasBtn").addEventListener("click", loadHistorias);
document.getElementById("cancelHistoriaBtn").addEventListener("click", () => historiaDialog.close());
document.getElementById("logoutBtn").addEventListener("click", logout);
historiaForm.addEventListener("submit", saveHistoria);

if (!getToken()) {
  logout();
} else {
  loadHistorias();
}