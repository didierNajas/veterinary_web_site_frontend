const API_BASE_URL = "http://localhost:8080/api";

const userInfo = document.getElementById("userInfo");
const welcomeText = document.getElementById("welcomeText");
const adminSection = document.getElementById("adminSection");
const usersTableBody = document.getElementById("usersTableBody");
const adminMessage = document.getElementById("adminMessage");
const passwordMessage = document.getElementById("passwordMessage");
const editUserDialog = document.getElementById("editUserDialog");
const editMessage = document.getElementById("editMessage");

let currentUser = null;
let usersCache = [];

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

  userInfo.textContent = "Cargando perfil...";

  try {
    const response = await apiFetch("/users/me", {
      headers: authHeaders(),
    });
    if (!response) return;

    if (!response.ok) {
      userInfo.classList.add("error");
      userInfo.textContent = await readErrorMessage(response);
      return;
    }

    currentUser = await response.json();
    localStorage.setItem("user", JSON.stringify(currentUser));
    userInfo.classList.remove("error");
    userInfo.textContent =
      `ID: ${currentUser.id}\n` +
      `Nombre: ${currentUser.fullName}\n` +
      `Email: ${currentUser.email}\n` +
      `Teléfono: ${currentUser.telefono || "-"}\n` +
      `Dirección: ${currentUser.direccion || "-"}\n` +
      `Rol: ${currentUser.role}\n` +
      `Estado: ${currentUser.activo ? "Activo" : "Inactivo"}`;

    welcomeText.textContent = `Hola, ${currentUser.fullName} (${currentUser.role})`;

    if (isAdmin(currentUser)) {
      adminSection.hidden = false;
      await loadUsers();
    } else {
      adminSection.hidden = true;
    }
  } catch (error) {
    userInfo.classList.add("error");
    userInfo.textContent =
      "No se pudo conectar con el backend. Verifica que esté corriendo en el puerto 8080.";
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
    renderUsersTable(usersCache);
  } catch (error) {
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
          <td>${escapeHtml(user.role)}</td>
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
document.getElementById("editUserForm").addEventListener("submit", saveEditedUser);
document.getElementById("cancelEditBtn").addEventListener("click", () => editUserDialog.close());

loadProfile();
