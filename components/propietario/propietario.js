const API_BASE_URL = "http://localhost:8080/api";

const propietariosTableBody = document.getElementById("propietariosTableBody");
const propietarioDialog = document.getElementById("propietarioDialog");
const propietarioForm = document.getElementById("propietarioForm");
const dialogTitle = document.getElementById("dialogTitle");
const propietarioMessage = document.getElementById("propietarioMessage");
const addPropietarioBtn = document.getElementById("addPropietarioBtn");
const cancelBtn = document.getElementById("cancelBtn");
const logoutBtn = document.getElementById("logoutBtn");

let propietarios = [];
let mascotas = [];
let editingId = null;

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken");
}

function authHeaders(includeJson = false) {
  const headers = {
    Authorization: `Bearer ${getToken()}`,
  };
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("tokenType");
  localStorage.removeItem("user");
  window.location.href = "/";
}

function showMessage(element, type, text) {
  element.hidden = false;
  element.className = `message ${type}`;
  element.textContent = text;
}

function hideMessage(element) {
  element.hidden = true;
  element.textContent = "";
  element.className = "message";
}

async function loadPropietarios() {
  try {
    const response = await fetch(`${API_BASE_URL}/propietarios`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error("Failed to load propietarios");
    propietarios = await response.json();
    // Load mascotas for each propietario
    await loadMascotas();
    renderPropietarios();
  } catch (error) {
    console.error(error);
    showMessage(propietarioMessage, "danger", "Error loading propietarios");
  }
}

async function loadMascotas() {
  try {
    const response = await fetch(`${API_BASE_URL}/mascotas`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error("Failed to load mascotas");
    mascotas = await response.json();
  } catch (error) {
    console.error("Warning: Could not load mascotas:", error);
    mascotas = []; // Set to empty array on error
  }
}

function renderPropietarios() {
  if (propietarios.length === 0) {
    propietariosTableBody.innerHTML = `<tr><td colspan="9">No hay propietarios</td></tr>`;
    return;
  }

  propietariosTableBody.innerHTML = propietarios
    .map(
      (p) => {
        // Find mascotas for this propietario
        const propietarioMascotas = mascotas.filter(m => m.idPropietario === p.idPropietario);
        const mascotasInfo = propietarioMascotas.length > 0 
          ? propietarioMascotas.map(m => m.nombre).join(", ")
          : "-";
        
        return `
      <tr>
        <td>${p.idPropietario}</td>
        <td>${p.nombre}</td>
        <td>${p.apellido}</td>
        <td>${p.telefono || "-"}</td>
        <td>${p.direccion || "-"}</td>
        <td>${new Date(p.fechaRegistro).toLocaleString()}</td>
        <td>${p.activo ? "Sí" : "No"}</td>
        <td>${mascotasInfo}</td>
        <td>
          <button class="btn btn-sm btn-primary edit-btn" data-id="${p.idPropietario}">Editar</button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${p.idPropietario}">Eliminar</button>
        </td>
      </tr>
    `;
      }
    )
    .join("");

  // Add event listeners to edit and delete buttons
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => editPropietario(btn.dataset.id));
  });
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deletePropietario(btn.dataset.id));
  });
}

function openDialog(isEdit = false, propietario = null) {
  if (isEdit && propietario) {
    dialogTitle.textContent = "Editar Propietario";
    editingId = propietario.idPropietario;
    propietarioForm.nombre.value = propietario.nombre;
    propietarioForm.apellido.value = propietario.apellido;
    propietarioForm.telefono.value = propietario.telefono || "";
    propietarioForm.direccion.value = propietario.direccion || "";
    propietarioForm.fechaRegistro.value = new Date(propietario.fechaRegistro)
      .toISOString()
      .slice(0, 16);
    propietarioForm.activo.checked = propietario.activo;
  } else {
    dialogTitle.textContent = "Agregar Propietario";
    editingId = null;
    propietarioForm.reset();
  }
  propietarioDialog.showModal();
}

function closeDialog() {
  propietarioDialog.close();
  hideMessage(propietarioMessage);
}

async function savePropietario(e) {
  e.preventDefault();
  const propietarioData = {
    nombre: propietarioForm.nombre.value,
    apellido: propietarioForm.apellido.value,
    telefono: propietarioForm.telefono.value,
    direccion: propietarioForm.direccion.value,
    fechaRegistro: propietarioForm.fechaRegistro.value,
    activo: propietarioForm.activo.checked,
  };

  try {
    let response;
    if (editingId) {
      response = await fetch(`${API_BASE_URL}/propietarios/${editingId}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify(propietarioData),
      });
    } else {
      response = await fetch(`${API_BASE_URL}/propietarios`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(propietarioData),
      });
    }

    if (!response.ok) throw new Error("Failed to save propietario");
    await loadPropietarios();
    closeDialog();
    showMessage(propietarioMessage, "success", "Propietario guardado correctamente");
  } catch (error) {
    console.error(error);
    showMessage(propietarioMessage, "danger", "Error al guardar propietario");
  }
}

async function editPropietario(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/propietarios/${id}`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error("Failed to load propietario");
    const propietario = await response.json();
    openDialog(true, propietario);
  } catch (error) {
    console.error(error);
    showMessage(propietarioMessage, "danger", "Error al cargar propietario para editar");
  }
}

async function deletePropietario(id) {
  if (!confirm("¿Estás seguro de eliminar este propietario?")) return;
  try {
    const response = await fetch(`${API_BASE_URL}/propietarios/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete propietario");
    await loadPropietarios();
    showMessage(propietarioMessage, "success", "Propietario eliminado correctamente");
  } catch (error) {
    console.error(error);
    showMessage(propietarioMessage, "danger", "Error al eliminar propietario");
  }
}

// Event listeners
addPropietarioBtn.addEventListener("click", () => openDialog());
cancelBtn.addEventListener("click", closeDialog);
propietarioForm.addEventListener("submit", savePropietario);
logoutBtn.addEventListener("click", logout);

// Initial load with authentication check
document.addEventListener("DOMContentLoaded", () => {
  const token = getToken();
  if (!token) {
    // Redirect to login page if no token
    window.location.href = "/";
    return;
  }
  loadPropietarios();
});