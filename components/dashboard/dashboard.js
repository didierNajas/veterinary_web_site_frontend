const API_BASE_URL = "http://localhost:8080/api";

const userInfo = document.getElementById("userInfo");
const welcomeText = document.getElementById("welcomeText");
const adminSection = document.getElementById("adminSection");
const usersTableBody = document.getElementById("usersTableBody");
const adminMessage = document.getElementById("adminMessage");
const adminNavLink = document.getElementById("adminNavLink");
const ownersNavLink = document.getElementById("ownersNavLink");
const ownersShortcut = document.getElementById("ownersShortcut");
const historiasNavLink = document.getElementById("historiasNavLink");
const historiasShortcut = document.getElementById("historiasShortcut");
const accountStatusMetric = document.getElementById("accountStatusMetric");
const roleMetric = document.getElementById("roleMetric");
const userIdMetric = document.getElementById("userIdMetric");
const ownersMetricCard = document.getElementById("ownersMetricCard");
const ownersMetric = document.getElementById("ownersMetric");
const petsMetricCard = document.getElementById("petsMetricCard");
const petsMetric = document.getElementById("petsMetric");
const usersMetricCard = document.getElementById("usersMetricCard");
const usersMetric = document.getElementById("usersMetric");
const passwordMessage = document.getElementById("passwordMessage");
const editUserDialog = document.getElementById("editUserDialog");
const editMessage = document.getElementById("editMessage");
const citasTableBody = document.getElementById("citasTableBody");
const citaMessage = document.getElementById("citaMessage");
const citaDialog = document.getElementById("citaDialog");
const citaForm = document.getElementById("citaForm");
const citaFormMessage = document.getElementById("citaFormMessage");
const servicesNavLink = document.getElementById("servicesNavLink");
const productsNavLink = document.getElementById("productsNavLink");
const servicesShortcut = document.getElementById("servicesShortcut");
const productsShortcut = document.getElementById("productsShortcut");

let currentUser = null;
let usersCache = [];
let citasCache = [];
let mascotasCache = [];
let serviciosCache = [];
let editingCitaId = null;
const propietariosSection = document.getElementById("propietariosSection");
const propietarioMessage = document.getElementById("propietarioMessage");
const propietariosTableBody = document.getElementById("propietariosTableBody");

async function loadPropietariosConMascotas() {
  hideMessage(propietarioMessage);
  ownersMetric.textContent = "—";
  petsMetric.textContent = "—";
  propietariosTableBody.innerHTML = `<tr><td colspan="7">Cargando propietarios y mascotas...</td></tr>`;

  try {
    // Fetch propietarios
    const propietariosResponse = await fetch(`${API_BASE_URL}/propietarios`, {
      headers: authHeaders(),
    });
    
    if (!propietariosResponse.ok) {
      throw new Error(`Error loading propietarios: ${propietariosResponse.status}`);
    }
    
    const propietarios = await propietariosResponse.json();
    
    // Fetch mascotas to associate with propietarios
    const mascotasResponse = await fetch(`${API_BASE_URL}/mascotas`, {
      headers: authHeaders(),
    });
    
    if (!mascotasResponse.ok) {
      throw new Error(`Error loading mascotas: ${mascotasResponse.status}`);
    }
    
    const mascotas = await mascotasResponse.json();
    
    // Group mascotas by propietario ID
    const mascotasPorPropietario = Object.create(null);
    mascotas.forEach(mascota => {
      const propietarioId = mascota.idPropietario;
      if (!mascotasPorPropietario[propietarioId]) {
        mascotasPorPropietario[propietarioId] = [];
      }
      mascotasPorPropietario[propietarioId].push(mascota);
    });

    ownersMetric.textContent = String(propietarios.length);
    petsMetric.textContent = String(mascotas.length);
    renderPropietariosTable(propietarios, mascotasPorPropietario);
  } catch (error) {
    propietariosTableBody.innerHTML = `<tr><td colspan="7">Error cargando datos: ${error.message}</td></tr>`;
    showMessage(propietarioMessage, "error", `Error cargando propietarios: ${error.message}`);
    console.error(error);
  }
}

function renderPropietariosTable(propietarios, mascotasPorPropietario) {
  if (!propietarios || propietarios.length === 0) {
    propietariosTableBody.innerHTML = `<tr><td colspan="7">No hay propietarios registrados</td></tr>`;
    return;
  }

  propietariosTableBody.innerHTML = propietarios
    .map(
      (p) => {
        const mascotas = mascotasPorPropietario[p.idPropietario] || [];
        const mascotasList = mascotas
          .map(m => `${escapeHtml(m.nombre)}${m.especie ? ` (${escapeHtml(m.especie)})` : ""}`)
          .join(", ");
        const mascotasCount = mascotas.length;
        const mascotasDisplay = mascotasCount > 0
          ? `<span class="badge badge-neutral">${mascotasCount} mascota${mascotasCount !== 1 ? "s" : ""}</span><br>${mascotasList}`
          : `<span class="badge badge-inactive">Sin mascotas</span>`;
        
        return `
          <tr>
            <td>${escapeHtml(p.idPropietario)}</td>
            <td>${escapeHtml(p.nombre)}</td>
            <td>${escapeHtml(p.apellido)}</td>
            <td>${escapeHtml(p.telefono || "-")}</td>
            <td>${escapeHtml(p.direccion || "-")}</td>
            <td>${mascotasDisplay}</td>
            <td>—</td>
          </tr>
        `;
      }
    )
    .join("");
}

async function loadCitas() {
  hideMessage(citaMessage);
  citasTableBody.innerHTML = `<tr><td colspan="9">Cargando citas...</td></tr>`;

  try {
    const [citasResponse, mascotasResponse, serviciosResponse] = await Promise.all([
      apiFetch("/citas", { headers: authHeaders() }),
      apiFetch("/mascotas", { headers: authHeaders() }),
      apiFetch("/servicios", { headers: authHeaders() }),
    ]);
    if (!citasResponse || !mascotasResponse || !serviciosResponse) return;

    if (!citasResponse.ok) {
      throw new Error(await readErrorMessage(citasResponse));
    }
    if (!mascotasResponse.ok) {
      throw new Error(await readErrorMessage(mascotasResponse));
    }
    if (!serviciosResponse.ok) {
      throw new Error(await readErrorMessage(serviciosResponse));
    }

    citasCache = await citasResponse.json();
    mascotasCache = await mascotasResponse.json();
    serviciosCache = await serviciosResponse.json();
    renderMascotaOptions();
    renderServicioOptions();
    renderCitasTable();
  } catch (error) {
    citasTableBody.innerHTML = `<tr><td colspan="9">No se pudieron cargar las citas.</td></tr>`;
    showMessage(citaMessage, "error", error.message || "No se pudieron cargar las citas.");
    console.error("Error cargando citas:", error);
  }
}

function renderMascotaOptions() {
  const mascotaSelect = citaForm.elements.namedItem("idMascota");
  mascotaSelect.innerHTML = `
    <option value="">Selecciona una mascota</option>
    ${mascotasCache.map((mascota) => `
      <option value="${escapeHtml(mascota.idMascota)}">${escapeHtml(mascota.nombre)} (#${escapeHtml(mascota.idMascota)})</option>
    `).join("")}
  `;
}

function renderServicioOptions(selectedId = null) {
  const servicioSelect = citaForm.elements.namedItem("idServicio");
  const serviciosDisponibles = serviciosCache.filter((servicio) =>
    servicio.activo || Number(servicio.idServicio) === Number(selectedId)
  );
  servicioSelect.innerHTML = `
    <option value="">Selecciona un servicio</option>
    ${serviciosDisponibles.map((servicio) => `
      <option value="${escapeHtml(servicio.idServicio)}">
        ${escapeHtml(servicio.nombreServicio)}${servicio.activo ? "" : " (inactivo)"}
      </option>
    `).join("")}
  `;
}

function renderCitasTable() {
  if (!citasCache.length) {
    citasTableBody.innerHTML = `<tr><td colspan="9">Todavía no hay citas registradas.</td></tr>`;
    return;
  }

  const mascotasPorId = new Map(mascotasCache.map((mascota) => [
    Number(mascota.idMascota),
    mascota.nombre,
  ]));
  const serviciosPorId = new Map(serviciosCache.map((servicio) => [
    Number(servicio.idServicio),
    servicio.nombreServicio,
  ]));

  citasTableBody.innerHTML = citasCache.map((cita) => {
    const estado = String(cita.estado || "PENDIENTE");
    const estadoNormalizado = estado.toUpperCase();
    const estadoClass = estadoNormalizado === "CANCELADA"
      ? "badge-inactive"
      : ["CONFIRMADA", "COMPLETADA"].includes(estadoNormalizado)
        ? "badge-active"
        : "badge-neutral";

    return `
      <tr>
        <td>${escapeHtml(cita.idCita)}</td>
        <td>${escapeHtml(mascotasPorId.get(Number(cita.idMascota)) || `Mascota #${cita.idMascota}`)}</td>
        <td>${escapeHtml(formatAppointmentDate(cita.fecha))}</td>
        <td>${escapeHtml(String(cita.hora || "").slice(0, 5))}</td>
        <td>${escapeHtml(serviciosPorId.get(Number(cita.idServicio)) || `Servicio #${cita.idServicio}`)}</td>
        <td>#${escapeHtml(cita.idVeterinario)}</td>
        <td><span class="badge ${estadoClass}">${escapeHtml(estado)}</span></td>
        <td>${escapeHtml(cita.motivo || "—")}</td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn btn-warning" data-action="edit-cita" data-id="${escapeHtml(cita.idCita)}">Editar</button>
            <button type="button" class="btn btn-danger" data-action="delete-cita" data-id="${escapeHtml(cita.idCita)}">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function formatAppointmentDate(date) {
  return String(date || "").split("-").reverse().join("/");
}

function openCitaDialog(cita = null) {
  hideMessage(citaFormMessage);
  citaForm.reset();
  editingCitaId = cita ? cita.idCita : null;
  document.getElementById("citaDialogTitle").textContent = cita ? "Editar cita" : "Nueva cita";

  if (cita) {
    renderServicioOptions(cita.idServicio);
    citaForm.elements.namedItem("idMascota").value = cita.idMascota;
    citaForm.elements.namedItem("idServicio").value = cita.idServicio;
    citaForm.elements.namedItem("idVeterinario").value = cita.idVeterinario;
    citaForm.elements.namedItem("fecha").value = cita.fecha;
    citaForm.elements.namedItem("hora").value = String(cita.hora || "").slice(0, 5);
    citaForm.elements.namedItem("estado").value = cita.estado || "PENDIENTE";
    citaForm.elements.namedItem("motivo").value = cita.motivo || "";
  } else {
    renderServicioOptions();
    citaForm.elements.namedItem("estado").value = "PENDIENTE";
  }

  citaDialog.showModal();
}

async function saveCita(event) {
  event.preventDefault();
  hideMessage(citaFormMessage);

  const payload = {
    idMascota: Number(citaForm.elements.namedItem("idMascota").value),
    idServicio: Number(citaForm.elements.namedItem("idServicio").value),
    idVeterinario: Number(citaForm.elements.namedItem("idVeterinario").value),
    fecha: citaForm.elements.namedItem("fecha").value,
    hora: citaForm.elements.namedItem("hora").value,
    estado: citaForm.elements.namedItem("estado").value,
    motivo: citaForm.elements.namedItem("motivo").value.trim() || null,
  };
  const path = editingCitaId ? `/citas/${editingCitaId}` : "/citas";

  try {
    const response = await apiFetch(path, {
      method: editingCitaId ? "PUT" : "POST",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    });
    if (!response) return;

    if (!response.ok) {
      showMessage(citaFormMessage, "error", await readErrorMessage(response));
      return;
    }

    citaDialog.close();
    await loadCitas();
    showMessage(citaMessage, "success", editingCitaId
      ? "Cita actualizada correctamente."
      : "Cita creada correctamente.");
  } catch (error) {
    showMessage(citaFormMessage, "error", "No se pudo guardar la cita.");
    console.error("Error guardando cita:", error);
  }
}

async function deleteCita(citaId) {
  if (!window.confirm(`¿Eliminar la cita #${citaId}?`)) return;

  try {
    const response = await apiFetch(`/citas/${citaId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!response) return;

    if (!response.ok) {
      showMessage(citaMessage, "error", await readErrorMessage(response));
      return;
    }

    await loadCitas();
    showMessage(citaMessage, "success", `Cita #${citaId} eliminada correctamente.`);
  } catch (error) {
    showMessage(citaMessage, "error", "No se pudo eliminar la cita.");
    console.error("Error eliminando cita:", error);
  }
}

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

function isAdmin(user) {
  return user && String(user.role).toUpperCase() === "ADMIN";
}

function getRoleLabel(role) {
  const roleLabels = {
    ADMIN: "Administrador",
    CUSTOMER: "Cliente",
    VETERINARIAN: "Veterinario",
  };
  const normalizedRole = String(role || "").toUpperCase();
  return roleLabels[normalizedRole] || normalizedRole || "Sin asignar";
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

async function readErrorMessage(response) {
  try {
    const data = await response.json();
    return data.message || `Error (${response.status})`;
  } catch {
    return `Error (${response.status})`;
  }
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (response.status === 401 || response.status === 403) {
    if (path !== "/users") {
      logout();
      return null;
    }
  }

  return response;
}

async function loadProfile() {
  const token = getToken();
  if (!token) {
    logout();
    return;
  }

  userInfo.innerHTML = `<div class="profile-field"><dt>Perfil</dt><dd>Cargando información...</dd></div>`;

  try {
    const response = await apiFetch("/users/me", {
      headers: authHeaders(),
    });
    if (!response) return;

    if (!response.ok) {
      userInfo.innerHTML = `<div class="profile-field"><dt>Estado del perfil</dt><dd class="profile-error">${escapeHtml(await readErrorMessage(response))}</dd></div>`;
      return;
    }

    currentUser = await response.json();
    localStorage.setItem("user", JSON.stringify(currentUser));
    document.getElementById("passwordUsername").value = currentUser.email || "";
    const roleLabel = getRoleLabel(currentUser.role);
    const canManageRecords = ["ADMIN", "VETERINARIAN"].includes(String(currentUser.role).toUpperCase());
    const accountStatus = currentUser.activo ? "Activo" : "Inactivo";

    userInfo.innerHTML = `
      <div class="profile-field"><dt>Nombre completo</dt><dd>${escapeHtml(currentUser.fullName)}</dd></div>
      <div class="profile-field"><dt>Correo electrónico</dt><dd>${escapeHtml(currentUser.email)}</dd></div>
      <div class="profile-field"><dt>Teléfono</dt><dd>${escapeHtml(currentUser.telefono || "No registrado")}</dd></div>
      <div class="profile-field"><dt>Dirección</dt><dd>${escapeHtml(currentUser.direccion || "No registrada")}</dd></div>
      <div class="profile-field"><dt>Rol</dt><dd>${escapeHtml(roleLabel)}</dd></div>
      <div class="profile-field"><dt>Estado</dt><dd><span class="badge ${currentUser.activo ? "badge-active" : "badge-inactive"}">${accountStatus}</span></dd></div>
    `;

    welcomeText.textContent = `Hola, ${currentUser.fullName}`;
    accountStatusMetric.innerHTML = `<span class="badge ${currentUser.activo ? "badge-active" : "badge-inactive"}">${accountStatus}</span>`;
    roleMetric.textContent = roleLabel;
    userIdMetric.textContent = `#${currentUser.id}`;
    adminSection.hidden = !isAdmin(currentUser);
    adminNavLink.hidden = !isAdmin(currentUser);
    usersMetricCard.hidden = !isAdmin(currentUser);
    historiasNavLink.hidden = !canManageRecords;
    ownersNavLink.hidden = !canManageRecords;
    servicesNavLink.hidden = !canManageRecords;
    productsNavLink.hidden = !canManageRecords;
    historiasShortcut.hidden = !canManageRecords;
    ownersShortcut.hidden = !canManageRecords;
    servicesShortcut.hidden = !canManageRecords;
    productsShortcut.hidden = !canManageRecords;
    propietariosSection.hidden = !canManageRecords;
    ownersMetricCard.hidden = !canManageRecords;
    petsMetricCard.hidden = !canManageRecords;

    if (isAdmin(currentUser)) {
      await loadUsers();
    }
    await loadCitas();
  } catch (error) {
    userInfo.innerHTML = `<div class="profile-field"><dt>Estado del perfil</dt><dd class="profile-error">No se pudo conectar con el backend. Verifica que esté corriendo en el puerto 8080.</dd></div>`;
    console.error(error);
  }
}

async function changePassword(event) {
  event.preventDefault();
  hideMessage(passwordMessage);

  if (!currentUser) {
    showMessage(passwordMessage, "error", "No hay sesión activa.");
    return;
  }

  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmNewPassword").value.trim();

  if (newPassword.length < 6) {
    showMessage(passwordMessage, "error", "La contraseña debe tener al menos 6 caracteres.");
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage(passwordMessage, "error", "Las contraseñas no coinciden.");
    return;
  }

  const payload = {
    fullName: currentUser.fullName,
    email: currentUser.email,
    telefono: currentUser.telefono || null,
    direccion: currentUser.direccion || null,
    password: newPassword,
  };

  try {
    const response = await apiFetch(`/users/${currentUser.id}`, {
      method: "PUT",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    });
    if (!response) return;

    if (!response.ok) {
      showMessage(passwordMessage, "error", await readErrorMessage(response));
      return;
    }

    document.getElementById("changePasswordForm").reset();
    showMessage(passwordMessage, "success", "Contraseña actualizada correctamente.");
  } catch (error) {
    showMessage(passwordMessage, "error", "No se pudo cambiar la contraseña.");
    console.error(error);
  }
}

async function loadUsers() {
  hideMessage(adminMessage);
  usersMetric.textContent = "—";
  usersTableBody.innerHTML = `<tr><td colspan="6">Cargando usuarios...</td></tr>`;

  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: authHeaders(),
    });

    if (response.status === 401) {
      logout();
      return;
    }

    if (response.status === 403) {
      adminSection.hidden = true;
      return;
    }

    if (!response.ok) {
      usersTableBody.innerHTML = `<tr><td colspan="6">${await readErrorMessage(response)}</td></tr>`;
      return;
    }

    usersCache = await response.json();
    usersMetric.textContent = String(usersCache.length);
    renderUsersTable(usersCache);
  } catch (error) {
    usersMetric.textContent = "—";
    usersTableBody.innerHTML =
      `<tr><td colspan="6">No se pudo cargar la lista de usuarios.</td></tr>`;
    console.error(error);
  }
}

function renderUsersTable(users) {
  if (!users.length) {
    usersTableBody.innerHTML = `<tr><td colspan="6">No hay usuarios registrados.</td></tr>`;
    return;
  }

  usersTableBody.innerHTML = users
    .map((user) => {
      const statusClass = user.activo ? "badge-active" : "badge-inactive";
      const statusText = user.activo ? "Activo" : "Inactivo";
      const disabled = user.activo ? "" : "disabled";

      return `
        <tr>
          <td>${user.id}</td>
          <td>${escapeHtml(user.fullName)}</td>
          <td>${escapeHtml(user.email)}</td>
          <td>${escapeHtml(getRoleLabel(user.role))}</td>
          <td><span class="badge ${statusClass}">${statusText}</span></td>
          <td>
            <div class="row-actions">
              <button
                type="button"
                class="btn btn-warning"
                data-action="edit"
                data-id="${user.id}"
                ${disabled}
              >Editar</button>
              <button
                type="button"
                class="btn btn-danger"
                data-action="delete"
                data-id="${user.id}"
                ${disabled}
              >Desactivar</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function openEditDialog(userId) {
  const user = usersCache.find((item) => item.id === Number(userId));
  if (!user) return;

  hideMessage(editMessage);
  document.getElementById("editUserId").value = user.id;
  document.getElementById("editFullName").value = user.fullName || "";
  document.getElementById("editEmail").value = user.email || "";
  document.getElementById("editTelefono").value = user.telefono || "";
  document.getElementById("editDireccion").value = user.direccion || "";
  document.getElementById("editRole").value = String(user.role || "CUSTOMER").toUpperCase();
  document.getElementById("editPassword").value = "";
  editUserDialog.showModal();
}

async function saveEditedUser(event) {
  event.preventDefault();
  hideMessage(editMessage);

  const id = document.getElementById("editUserId").value;
  const password = document.getElementById("editPassword").value.trim();

  const payload = {
    fullName: document.getElementById("editFullName").value.trim(),
    email: document.getElementById("editEmail").value.trim(),
    telefono: document.getElementById("editTelefono").value.trim() || null,
    direccion: document.getElementById("editDireccion").value.trim() || null,
    role: document.getElementById("editRole").value,
  };

  if (password) {
    if (password.length < 6) {
      showMessage(editMessage, "error", "La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    payload.password = password;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      logout();
      return;
    }

    if (!response.ok) {
      showMessage(editMessage, "error", await readErrorMessage(response));
      return;
    }

    editUserDialog.close();
    showMessage(adminMessage, "success", `Usuario #${id} actualizado.`);
    await loadUsers();
    if (currentUser && Number(id) === currentUser.id) {
      await loadProfile();
    }
  } catch (error) {
    showMessage(editMessage, "error", "No se pudo actualizar el usuario.");
    console.error(error);
  }
}

async function softDeleteUser(userId) {
  const user = usersCache.find((item) => item.id === Number(userId));
  if (!user) return;

  const confirmed = window.confirm(
    `¿Desactivar a ${user.fullName}? El registro no se eliminará, solo quedará inactivo.`
  );
  if (!confirmed) return;

  hideMessage(adminMessage);

  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (response.status === 401) {
      logout();
      return;
    }

    if (!response.ok) {
      showMessage(adminMessage, "error", await readErrorMessage(response));
      return;
    }

    showMessage(adminMessage, "success", `Usuario #${userId} desactivado.`);
    await loadUsers();

    if (currentUser && Number(userId) === currentUser.id) {
      logout();
    }
  } catch (error) {
    showMessage(adminMessage, "error", "No se pudo desactivar el usuario.");
    console.error(error);
  }
}

usersTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;

  const userId = button.dataset.id;
  if (button.dataset.action === "edit") {
    openEditDialog(userId);
  }
  if (button.dataset.action === "delete") {
    softDeleteUser(userId);
  }
});

document.getElementById("refreshBtn").addEventListener("click", loadProfile);
document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("changePasswordForm").addEventListener("submit", changePassword);
document.getElementById("reloadUsersBtn").addEventListener("click", loadUsers);
document.getElementById("reloadPropietariosBtn").addEventListener("click", loadPropietariosConMascotas);
document.getElementById("reloadCitasBtn").addEventListener("click", loadCitas);
document.getElementById("addCitaBtn").addEventListener("click", () => openCitaDialog());
document.getElementById("cancelCitaBtn").addEventListener("click", () => citaDialog.close());
citaForm.addEventListener("submit", saveCita);
citasTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const citaId = Number(button.dataset.id);
  if (button.dataset.action === "edit-cita") {
    const cita = citasCache.find((item) => Number(item.idCita) === citaId);
    if (cita) openCitaDialog(cita);
  } else if (button.dataset.action === "delete-cita") {
    deleteCita(citaId);
  }
});
document.getElementById("editUserForm").addEventListener("submit", saveEditedUser);
document.getElementById("cancelEditBtn").addEventListener("click", () => editUserDialog.close());

document.querySelector(".side-nav").addEventListener("click", (event) => {
  const link = event.target.closest("a.nav-link");
  if (!link) return;

  document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("is-active"));
  link.classList.add("is-active");
});

loadProfile().then(() => {
  if (currentUser && ["ADMIN", "VETERINARIAN"].includes(String(currentUser.role).toUpperCase())) {
    loadPropietariosConMascotas();
  }
});
