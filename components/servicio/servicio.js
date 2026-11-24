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

const serviciosTableBody = document.getElementById("serviciosTableBody");
const servicioMessage = document.getElementById("servicioMessage");
const servicioDialog = document.getElementById("servicioDialog");
const servicioForm = document.getElementById("servicioForm");
const servicioFormMessage = document.getElementById("servicioFormMessage");

let servicios = [];
let editingId = null;

async function loadServicios() {
  hideMessage(servicioMessage);
  serviciosTableBody.innerHTML = `<tr><td colspan="7">Cargando servicios...</td></tr>`;

  try {
    const response = await apiRequest("/servicios", { headers: authHeaders() });
    if (!response) return false;
    if (!response.ok) throw new Error(await responseError(response));

    servicios = await response.json();
    renderServicios();
    return true;
  } catch (error) {
    serviciosTableBody.innerHTML = `<tr><td colspan="7">No se pudieron cargar los servicios.</td></tr>`;
    showMessage(servicioMessage, "error", error.message || "No se pudieron cargar los servicios.");
    console.error("Error cargando servicios:", error);
    return false;
  }
}

function renderServicios() {
  if (!servicios.length) {
    serviciosTableBody.innerHTML = `<tr><td colspan="7">No hay servicios registrados.</td></tr>`;
    return;
  }

  serviciosTableBody.innerHTML = servicios.map((servicio) => `
    <tr>
      <td>${escapeHtml(servicio.idServicio)}</td>
      <td>${escapeHtml(servicio.nombreServicio)}</td>
      <td>${escapeHtml(servicio.descripcion || "—")}</td>
      <td>${escapeHtml(servicio.duracionMin)} min</td>
      <td>${escapeHtml(formatCurrency(servicio.precio))}</td>
      <td><span class="badge ${servicio.activo ? "badge-active" : "badge-inactive"}">${servicio.activo ? "Activo" : "Inactivo"}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-warning" data-action="edit" data-id="${escapeHtml(servicio.idServicio)}">Editar</button>
          ${servicio.activo
            ? `<button type="button" class="btn btn-danger" data-action="deactivate" data-id="${escapeHtml(servicio.idServicio)}">Desactivar</button>`
            : ""}
        </div>
      </td>
    </tr>
  `).join("");
}

function openServicioDialog(servicio = null) {
  hideMessage(servicioFormMessage);
  servicioForm.reset();
  editingId = servicio ? servicio.idServicio : null;
  document.getElementById("servicioDialogTitle").textContent = servicio ? "Editar servicio" : "Nuevo servicio";

  if (servicio) {
    servicioForm.elements.namedItem("nombreServicio").value = servicio.nombreServicio || "";
    servicioForm.elements.namedItem("descripcion").value = servicio.descripcion || "";
    servicioForm.elements.namedItem("duracionMin").value = servicio.duracionMin;
    servicioForm.elements.namedItem("precio").value = servicio.precio;
    servicioForm.elements.namedItem("activo").value = String(Boolean(servicio.activo));
  } else {
    servicioForm.elements.namedItem("activo").value = "true";
  }

  servicioDialog.showModal();
}

async function saveServicio(event) {
  event.preventDefault();
  hideMessage(servicioFormMessage);

  const payload = {
    nombreServicio: servicioForm.elements.namedItem("nombreServicio").value.trim(),
    descripcion: servicioForm.elements.namedItem("descripcion").value.trim() || null,
    duracionMin: Number(servicioForm.elements.namedItem("duracionMin").value),
    precio: Number(servicioForm.elements.namedItem("precio").value),
    activo: servicioForm.elements.namedItem("activo").value === "true",
  };
  const path = editingId ? `/servicios/${editingId}` : "/servicios";

  try {
    const response = await apiRequest(path, {
      method: editingId ? "PUT" : "POST",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    });
    if (!response) return;
    if (!response.ok) {
      showMessage(servicioFormMessage, "error", await responseError(response));
      return;
    }

    servicioDialog.close();
    const saved = await loadServicios();
    if (saved) showMessage(servicioMessage, "success", editingId
      ? "Servicio actualizado correctamente."
      : "Servicio creado correctamente.");
  } catch (error) {
    showMessage(servicioFormMessage, "error", "No se pudo guardar el servicio.");
    console.error("Error guardando servicio:", error);
  }
}

async function deactivateServicio(id) {
  const servicio = servicios.find((item) => Number(item.idServicio) === Number(id));
  if (!servicio || !window.confirm(`¿Desactivar "${servicio.nombreServicio}"?`)) return;

  try {
    const response = await apiRequest(`/servicios/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!response) return;
    if (!response.ok) {
      showMessage(servicioMessage, "error", await responseError(response));
      return;
    }

    const loaded = await loadServicios();
    if (loaded) showMessage(servicioMessage, "success", "Servicio desactivado correctamente.");
  } catch (error) {
    showMessage(servicioMessage, "error", "No se pudo desactivar el servicio.");
    console.error("Error desactivando servicio:", error);
  }
}

serviciosTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  if (button.dataset.action === "edit") {
    const servicio = servicios.find((item) => Number(item.idServicio) === Number(button.dataset.id));
    if (servicio) openServicioDialog(servicio);
  } else if (button.dataset.action === "deactivate") {
    deactivateServicio(button.dataset.id);
  }
});

document.getElementById("addServicioBtn").addEventListener("click", () => openServicioDialog());
document.getElementById("reloadServiciosBtn").addEventListener("click", loadServicios);
document.getElementById("cancelServicioBtn").addEventListener("click", () => servicioDialog.close());
document.getElementById("logoutBtn").addEventListener("click", logout);
servicioForm.addEventListener("submit", saveServicio);

if (!getToken()) {
  logout();
} else {
  loadServicios();
}
