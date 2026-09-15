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
        const propietario = propietarios.find(p => p.idPropietario === m.idPropietario);
        const propietarioNombre = propietario ? `${propietario.nombre} ${propietario.apellido}` : `-`;
        
        return `
          <tr>
            <td>${m.idMascota}</td>
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
              <button class="btn btn-sm btn-primary edit-btn" data-id="${m.idMascota}">Editar</button>
              <button class="btn btn-sm btn-danger delete-btn" data-id="${m.idMascota}">Eliminar</button>
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
    editingId = mascota.idMascota;
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
    
    // Handle propietario toggle based on whether we're editing
    const existingRadio = document.querySelector('input[name="propietarioOption"][value="existing"]');
    const newRadio = document.querySelector('input[name="propietarioOption"][value="new"]');
    const existingField = document.getElementById("existingPropietarioField");
    const newFields = document.getElementById("newPropietarioFields");
    const propietarioNombreInput = document.getElementById("propietarioNombre");
    const propietarioApellidoInput = document.getElementById("propietarioApellido");
    const propietarioDireccionInput = document.getElementById("propietarioDireccion");
    
    if (existingRadio && newRadio && existingField && newFields) {
      // Always use existing propietario option when editing
      existingRadio.checked = true;
      newRadio.checked = false;
      existingField.style.display = "block";
      newFields.style.display = "none";
      // Clear new propietario fields and remove required attributes to prevent validation issues
      propietarioNombreInput.value = "";
      propietarioNombreInput.removeAttribute("required");
      propietarioApellidoInput.value = "";
      propietarioApellidoInput.removeAttribute("required");
      propietarioDireccionInput.value = "";
      propietarioDireccionInput.removeAttribute("required");
      document.getElementById("propietarioTelefono").value = "";
      document.getElementById("propietarioFechaRegistro").value = "";
      document.getElementById("propietarioActivo").checked = true;
    }
  } else {
    dialogTitle.textContent = "Agregar Mascota";
    editingId = null;
    mascotaForm.reset();
    // Reset propietario toggle to default state for new mascota
    const existingRadio = document.querySelector('input[name="propietarioOption"][value="existing"]');
    const newRadio = document.querySelector('input[name="propietarioOption"][value="new"]');
    const existingField = document.getElementById("existingPropietarioField");
    const newFields = document.getElementById("newPropietarioFields");
    
    if (existingRadio && newRadio && existingField && newFields) {
      existingRadio.checked = true;
      newRadio.checked = false;
      existingField.style.display = "block";
      newFields.style.display = "none";
      // Clear new propietario fields
      document.getElementById("propietarioNombre").value = "";
      document.getElementById("propietarioApellido").value = "";
      document.getElementById("propietarioTelefono").value = "";
      document.getElementById("propietarioDireccion").value = "";
      document.getElementById("propietarioFechaRegistro").value = "";
      document.getElementById("propietarioActivo").checked = true;
    }
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
      propietarioId = newPropietario.idPropietario;
      
      showMessage(mascotaMessage, "success", "Propietario creado correctamente");
    } catch (error) {
      console.error(error);
      showMessage(mascotaMessage, "danger", "Error al crear propietario");
      return;
    }
  }
  
  // Trim string values and validate
  const nombre = mascotaForm.nombre.value.trim();
  const especie = mascotaForm.especie.value.trim();
  const raza = mascotaForm.raza.value.trim();
  const sexo = mascotaForm.sexo.value;
  const pesoStr = mascotaForm.peso.value.trim();
  const fechaNacimientoInput = mascotaForm.fechaNacimiento.value;
  const fechaRegistroInput = mascotaForm.fechaRegistro.value;
  
  // Basic validation
  if (!nombre) {
    showMessage(mascotaMessage, "danger", "El nombre de la mascota es requerido");
    return;
  }
  
  if (!especie) {
    showMessage(mascotaMessage, "danger", "La especie es requerida");
    return;
  }
  
  if (!sexo) {
    showMessage(mascotaMessage, "danger", "El sexo es requerido");
    return;
  }
  
  const peso = parseFloat(pesoStr);
  if (isNaN(peso) || peso <= 0) {
    showMessage(mascotaMessage, "danger", "Por favor ingrese un peso válido mayor a cero");
    return;
  }
  
  if (!fechaNacimientoInput) {
    showMessage(mascotaMessage, "danger", "La fecha de nacimiento es requerida");
    return;
  }
  
  if (!fechaRegistroInput) {
    showMessage(mascotaMessage, "danger", "La fecha de registro es requerida");
    return;
  }
  
  // Convert dates to ISO format with time for LocalDateTime compatibility
  const fechaNacimiento = fechaNacimientoInput ? new Date(fechaNacimientoInput + "T00:00:00").toISOString() : "";
  const fechaRegistro = fechaRegistroInput ? new Date(fechaRegistroInput + ":00").toISOString() : "";
  
  // Handle optional integer fields properly (check for empty string, not just falsy)
  const idVeterinarioStr = mascotaForm.idVeterinario.value.trim();
  const idVeterinario = idVeterinarioStr !== "" ? parseInt(idVeterinarioStr) : null;
  
  const mascotaData = {
    nombre: nombre,
    especie: especie,
    raza: raza,
    sexo: sexo,
    peso: peso,
    fechaNacimiento: fechaNacimiento,
    idPropietario: propietarioId,
    idVeterinario: idVeterinario,
    fechaRegistro: fechaRegistro,
    activo: mascotaForm.activo.checked,
  };

  console.log("Saving mascota with data:", mascotaData);
  console.log("Editing ID:", editingId);

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

    console.log("Response status:", response.status);
    console.log("Response statusText:", response.statusText);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Backend response:", errorData);
      throw new Error(`Failed to save mascota: ${response.status} ${response.statusText} - ${errorData}`);
    }
    await loadMascotas();
    closeDialog();
    showMessage(mascotaMessage, "success", "Mascota guardada correctamente");
  } catch (error) {
    console.error(error);
    showMessage(mascotaMessage, "danger", `Error al guardar mascota: ${error.message}`);
  }
}

async function editMascota(idMascota) {
  try {
    const response = await fetch(`${API_BASE_URL}/mascotas/${idMascota}`, {
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