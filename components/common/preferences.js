const LANGUAGE_KEY = "vetcare-language";
const THEME_KEY = "vetcare-theme";
const commonMessages = {
  es: {
    enableDarkMode: "Modo oscuro",
    enableLightMode: "Modo claro",
    backToDashboard: "Volver al panel",
    logout: "Cerrar sesión",
    refresh: "Actualizar",
    create: "Crear",
    edit: "Editar",
    delete: "Eliminar",
    save: "Guardar",
    cancel: "Cancelar",
    actions: "Acciones",
    loading: "Cargando…",
    empty: "No hay registros todavía.",
    retry: "Reintentar",
    requiredFields: "Completa los campos obligatorios.",
    saveFailed: "No se pudo guardar. Inténtalo de nuevo.",
    deleteFailed: "No se pudo eliminar el registro.",
    requestFailed: "No se pudieron cargar los datos.",
    confirmDelete: "¿Eliminar este registro?",
    created: "Registro creado correctamente.",
    updated: "Registro actualizado correctamente.",
    deleted: "Registro eliminado correctamente.",
  },
  en: {
    enableDarkMode: "Dark mode",
    enableLightMode: "Light mode",
    backToDashboard: "Back to dashboard",
    logout: "Sign out",
    refresh: "Refresh",
    create: "Create",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    actions: "Actions",
    loading: "Loading…",
    empty: "There are no records yet.",
    retry: "Try again",
    requiredFields: "Complete all required fields.",
    saveFailed: "Could not save. Please try again.",
    deleteFailed: "Could not delete the record.",
    requestFailed: "Could not load the data.",
    confirmDelete: "Delete this record?",
    created: "Record created successfully.",
    updated: "Record updated successfully.",
    deleted: "Record deleted successfully.",
  },
};

export function initPreferences(translations) {
  const messages = {
    es: { ...commonMessages.es, ...translations.es },
    en: { ...commonMessages.en, ...translations.en },
  };
  let language = localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "es";
  let theme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";

  const t = (key, values = {}) => {
    let text = messages[language]?.[key] ?? messages.es?.[key] ?? key;
    for (const [name, value] of Object.entries(values)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
    return text;
  };

  function applyPreferences() {
    const root = document.documentElement;
    root.lang = language;
    root.dataset.theme = theme;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.placeholder = t(element.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });

    document.querySelectorAll("[data-language-toggle]").forEach((button) => {
      button.textContent = language === "es" ? "English" : "Español";
      button.setAttribute("aria-label", language === "es" ? "Switch language to English" : "Cambiar idioma a español");
    });
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.textContent = theme === "light" ? t("enableDarkMode") : t("enableLightMode");
      button.setAttribute("aria-label", button.textContent);
    });

    localStorage.setItem(LANGUAGE_KEY, language);
    localStorage.setItem(THEME_KEY, theme);
    window.dispatchEvent(new CustomEvent("vetcare:preferences", {
      detail: { language, theme },
    }));
  }

  document.querySelectorAll("[data-language-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      language = language === "es" ? "en" : "es";
      applyPreferences();
    });
  });
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      theme = theme === "light" ? "dark" : "light";
      applyPreferences();
    });
  });

  applyPreferences();
  return {
    t,
    get language() {
      return language;
    },
    get locale() {
      return language === "es" ? "es-CO" : "en-US";
    },
  };
}
