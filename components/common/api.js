const API_BASE_URL = "http://localhost:8080/api";

export function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken");
}

export function authHeaders(includeJson = false) {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("tokenType");
  localStorage.removeItem("user");
  window.location.href = "/";
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (response.status === 401) {
    logout();
    return null;
  }
  return response;
}

export async function responseError(response) {
  try {
    const data = await response.json();
    return data.message || `Error (${response.status})`;
  } catch {
    return `Error (${response.status})`;
  }
}

export async function apiJson(path, options = {}) {
  const response = await apiRequest(path, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  if (!response) return null;
  if (!response.ok) throw new Error(await responseError(response));
  if (response.status === 204) return true;
  return response.json();
}

export function createCrudService(resourcePath) {
  return {
    list: () => apiJson(resourcePath, { headers: authHeaders() }),
    get: (id) => apiJson(`${resourcePath}/${encodeURIComponent(id)}`, { headers: authHeaders() }),
    save: (id, payload) => apiJson(id ? `${resourcePath}/${encodeURIComponent(id)}` : resourcePath, {
      method: id ? "PUT" : "POST",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    }),
    remove: (id) => apiJson(`${resourcePath}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(),
    }),
  };
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function showMessage(element, type, text) {
  element.hidden = false;
  element.className = `message ${type}`;
  element.setAttribute("role", type === "error" ? "alert" : "status");
  element.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  element.textContent = text;
}

export function hideMessage(element) {
  element.hidden = true;
  element.textContent = "";
  element.className = "message";
  element.setAttribute("role", "status");
  element.setAttribute("aria-live", "polite");
}

export function formatCurrency(value, locale = "es-CO") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  }).format(Number(value));
}
