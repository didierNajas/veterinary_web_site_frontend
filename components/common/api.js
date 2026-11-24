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
  element.textContent = text;
}

export function hideMessage(element) {
  element.hidden = true;
  element.textContent = "";
  element.className = "message";
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  }).format(Number(value));
}
