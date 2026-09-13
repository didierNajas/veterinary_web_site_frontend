const API_BASE_URL = "http://localhost:8080/api";

const mascotasTableBody = document.getElementById("mascotasTableBody");
const mascotaDialog = document.getElementById("mascotaDialog");
const mascotaForm = document.getElementById("mascotaForm");
const dialogTitle = document.getElementById("dialogTitle");
const mascotaMessage = document.getElementById("mascotaMessage");
const addMascotaBtn = document.getElementById("addMascotaBtn");
const cancelBtn = document.getElementById("cancelBtn");
const logoutBtn = document.getElementById("logoutBtn");

let mascotas = [];
let propietarios = []; // For dropdown if needed
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
    // We could populate a dropdown here if needed
  } catch (error) {
    console.error("Warning: Could not load propietarios for mascota form:", error);
  }
}

// Function to handle propietario option changes
function setupPropietarioToggle() {
  const existingRadio = document.querySelector('input[name="propietarioOption"][value="existing"]');
  const newRadio = document.querySelector('input[name="propietarioOption"][value="new"]');
  const existingField = document.getElementById("existingPropietarioField");
  const newFields = document.getElementById("newPropietarioFields");
  
  if (existingRadio && newRadio) {
    existingRadio.addEventListener("change", () => {
      existingField.style.display = "block";
      newFields.style.display = "none";
      // Clear new propietario fields when switching to existing
      document.getElementById("propietarioNombre").value = "";
      document.getElementById("propietarioApellido").value = "";
      document.getElementById("propietarioTelefono").value = "";
      document.getElementById("propietarioDireccion").value = "";
      document.getElementById("propietarioFechaRegistro").value = "";
      document.getElementById("propietarioActivo").checked = true;
    });
    
    newRadio.addEventListener("change", () => {
      existingField.style.display = "none";
      newFields.style.display = "block";
      // Clear existing propietario ID when switching to new
      document.getElementById("idPropietario").value = "";
    });
  }
}

async function loadMascotas() {
  try {
    const response = await fetch(`${API_BASE_URL}/mascotas`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error("Failed to load mascotas");
    mascotas = await response.json();
    renderMascotas();
  } catch (error) {
    console.error(error);
    showMessage(mascotaMessage, "danger", "Error loading mascotas");
  }
}

function renderMascotas() {
  if (mascotas.length === 0) {
    mascotasTableBody.innerHTML = `<tr><td colspan="11">No hay mascotas</td></tr>`;
    return;
  }

  mascotasTableBody.innerHTML = mascotas
    .map(
      (m) => {
        // Find the propietario by idPropietario
        const propietario = propietarios.find(p => p.id === m.idPropietario);
        const propietarioNombre = propietario ? `${propietario.nombre} ${propietario.apellido}` : `-`;
        
        return `
          <tr>
            <td>${m.id}</td>
            <td>${m.nombre}</td>
            <td>${m.especie || "-"}</td>
            <td>${m.raza || "-"}</td>
            <td>${m.sexo || "-"}</td>
            <td>${m.peso || "-"} kg</td>
            <td>${m.fechaNacimiento ? new Date(m.fechaNacimiento).toLocaleDateString() : "-"}</td>
            <td>${propietarioNombre}</td>
            <td>${m.fechaRegistro ? new Date(m.fechaRegistro).toLocaleString() : "-"}</td>
            <td>${m.activo ? "Sí" : "No"}</td>
            <td>
              <button class="btn btn-sm btn-primary edit-btn" data-id="${m.id}">Editar</button>
              <button class="btn btn-sm btn-danger delete-btn" data-id="${m.id}">Eliminar</button>
            </td>
          </tr>
        `;
      }
    )
    .join("");

  // Add event listeners to edit and delete buttons
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => editMascota(btn.dataset.id));
  });
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteMascota(btn.dataset.id));
  });
}

function openDialog(isEdit = false, mascota = null) {
  if (isEdit && mascota) {
    dialogTitle.textContent = "Editar Mascota";
    editingId = mascota.id;
    mascotaForm.nombre.value = mascota.nombre;
    mascotaForm.especie.value = mascota.especie || "";
    mascotaForm.raza.value = mascota.raza || "";
    mascotaForm.sexo.value = mascota.sexo || "";
    mascotaForm.peso.value = mascota.peso || "";
    mascotaForm.fechaNacimiento.value = mascota.fechaNacimiento
      ? new Date(mascota.fechaNacimiento).toISOString().split("T")[0]
      : "";
    mascotaForm.idPropietario.value = mascota.idPropietario || "";
    mascotaForm.idVeterinario.value = mascota.idVeterinario || "";
    mascotaForm.fechaRegistro.value = new Date(mascota.fechaRegistro)
      .toISOString()
      .slice(0, 16);
    mascotaForm.activo.checked = mascota.activo;
  } else {
    dialogTitle.textContent = "Agregar Mascota";
    editingId = null;
    mascotaForm.reset();
  }
  mascotaDialog.showModal();
}

function closeDialog() {
  mascotaDialog.close();
  hideMessage(mascotaMessage);
}

async function saveMascota(e) {
  e.preventDefault();
  
  // Check which propietario option is selected
  const propietarioOption = document.querySelector('input[name="propietarioOption"]:checked').value;
  
  let propietarioId = null;
  
  if (propietarioOption === "existing") {
    // Use existing propietario ID
    propietarioId = parseInt(mascotaForm.idPropietario.value);
    if (!propietarioId || propietarioId <= 0) {
      showMessage(mascotaMessage, "danger", "Por favor seleccione un propietario válido");
      return;
    }
  } else {
    // Create new propietario
    try {
      const propietarioData = {
        nombre: document.getElementById("propietarioNombre").value,
        apellido: document.getElementById("propietarioApellido").value,
        telefono: document.getElementById("propietarioTelefono").value,
        direccion: document.getElementById("propietarioDireccion").value,
        fechaRegistro: document.getElementById("propietarioFechaRegistro").value,
        activo: document.getElementById("propietarioActivo").checked
      };
      
      const response = await fetch(`${API_BASE_URL}/propietarios`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(propietarioData),
      });
      
      if (!response.ok) throw new Error("Failed to create propietario");
      
      const newPropietario = await response.json();
      propietarioId = newPropietario.id;
      
      showMessage(mascotaMessage, "success", "Propietario creado correctamente");
    } catch (error) {
      console.error(error);
      showMessage(mascotaMessage, "danger", "Error al crear propietario");
      return;
    }
  }
  
  const mascotaData = {
    nombre: mascotaForm.nombre.value,
    especie: mascotaForm.especie.value,
    raza: mascotaForm.raza.value,
    sexo: mascotaForm.sexo.value,
    peso: parseFloat(mascotaForm.peso.value),
    fechaNacimiento: mascotaForm.fechaNacimiento.value,
    idPropietario: propietarioId,
    idVeterinario: mascotaForm.idVeterinario.value ? parseInt(mascotaForm.idVeterinario.value) : null,
    fechaRegistro: mascotaForm.fechaRegistro.value,
    activo: mascotaForm.activo.checked,
  };

  try {
    let response;
    if (editingId) {
      response = await fetch(`${API_BASE_URL}/mascotas/${editingId}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify(mascotaData),
      });
    } else {
      response = await fetch(`${API_BASE_URL}/mascotas`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(mascotaData),
      });
    }

    if (!response.ok) throw new Error("Failed to save mascota");
    await loadMascotas();
    closeDialog();
    showMessage(mascotaMessage, "success", "Mascota guardada correctamente");
  } catch (error) {
    console.error(error);
    showMessage(mascotaMessage, "danger", "Error al guardar mascota");
  }
}

async function editMascota(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/mascotas/${id}`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error("Failed to load mascota");
    const mascota = await response.json();
    openDialog(true, mascota);
  } catch (error) {
    console.error(error);
    showMessage(mascotaMessage, "danger", "Error al cargar mascota para editar");
  }
}

async function deleteMascota(id) {
  if (!confirm("¿Estás seguro de eliminar esta mascota?")) return;
  try {
    const response = await fetch(`${API_BASE_URL}/mascotas/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete mascota");
    await loadMascotas();
    showMessage(mascotaMessage, "success", "Mascota eliminada correctamente");
  } catch (error) {
    console.error(error);
    showMessage(mascotaMessage, "danger", "Error al eliminar mascota");
  }
}

// Event listeners
addMascotaBtn.addEventListener("click", () => openDialog());
cancelBtn.addEventListener("click", closeDialog);
mascotaForm.addEventListener("submit", saveMascota);
logoutBtn.addEventListener("click", logout);

// Initial load
document.addEventListener("DOMContentLoaded", async () => {
  await loadPropietarios();
  await loadMascotas();
});