const API_BASE_URL = "http://localhost:8080/api";

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const loginMessage = document.getElementById("loginMessage");
const signupMessage = document.getElementById("signupMessage");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const firstName = document.getElementById("firstName");
const lastName = document.getElementById("lastName");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const confirmPassword = document.getElementById("confirmPassword");
const termsCheck = document.getElementById("termsCheck");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function resetInputs(inputs) {
  inputs.forEach((input) => {
    input.classList.remove("error", "success");
  });
}

function setInputState(input, state) {
  input.classList.remove("error", "success");
  if (state) input.classList.add(state);
}

function showMessage(box, type, title, text) {
  box.className = "message " + type + " show";
  box.querySelector(".icon").textContent = type === "success" ? "✓" : "!";
  box.querySelector("strong").textContent = title;
  box.querySelector("span").textContent = text;
}

function saveSession(data) {
  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("authToken", data.token);
  }
  if (data.tokenType) {
    localStorage.setItem("tokenType", data.tokenType);
  }
  if (data.user) {
    localStorage.setItem("user", JSON.stringify(data.user));
  }
}

async function readErrorMessage(response) {
  try {
    const errorData = await response.json();
    return errorData.message || "Request failed";
  } catch {
    return "Request failed (" + response.status + ")";
  }
}

/* LOGIN SUBMISSION */
loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const inputs = [loginEmail, loginPassword];
  resetInputs(inputs);

  let valid = true;

  if (loginEmail.value.trim() === "") {
    setInputState(loginEmail, "error");
    valid = false;
  } else if (!isValidEmail(loginEmail.value.trim())) {
    setInputState(loginEmail, "error");
    valid = false;
  } else {
    setInputState(loginEmail, "success");
  }

  if (loginPassword.value.trim() === "") {
    setInputState(loginPassword, "error");
    valid = false;
  } else if (loginPassword.value.trim().length < 6) {
    setInputState(loginPassword, "error");
    valid = false;
  } else {
    setInputState(loginPassword, "success");
  }

  if (!valid) {
    showMessage(
      loginMessage,
      "error",
      "Login Failed",
      "Porfavor inserta un email valido y una contraseña de maximo 6 caracteres."
    );
    return;
  }

  try {
    showMessage(loginMessage, "info", "Iniciando Sesion", "Please wait...");

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: loginEmail.value.trim(),
        password: loginPassword.value.trim(),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      saveSession(data);
      showMessage(
        loginMessage,
        "success",
        "Sesion Iniciada Correctamente",
        "Bienvenido de nuevo! Redirigiendo..."
      );
      loginForm.reset();
      setTimeout(() => {
        resetInputs(inputs);
        window.location.href = "../dashboard/dashboard.html";
      }, 1500);
    } else {
      showMessage(
        loginMessage,
        "error",
        "Inicio Sesion Fallido",
        await readErrorMessage(response)
      );
    }
  } catch (error) {
    showMessage(
      loginMessage,
      "error",
      "Connection Error",
      "Unable to connect to server. Please make sure the backend is running on http://localhost:8080."
    );
    console.error("Login error:", error);
  }
});

/* SIGNUP SUBMISSION */
signupForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const inputs = [firstName, lastName, signupEmail, signupPassword, confirmPassword];
  resetInputs(inputs);

  let valid = true;

  if (firstName.value.trim() === "") {
    setInputState(firstName, "error");
    valid = false;
  } else {
    setInputState(firstName, "success");
  }

  if (lastName.value.trim() === "") {
    setInputState(lastName, "error");
    valid = false;
  } else {
    setInputState(lastName, "success");
  }

  if (signupEmail.value.trim() === "" || !isValidEmail(signupEmail.value.trim())) {
    setInputState(signupEmail, "error");
    valid = false;
  } else {
    setInputState(signupEmail, "success");
  }

  if (signupPassword.value.trim().length < 6) {
    setInputState(signupPassword, "error");
    valid = false;
  } else {
    setInputState(signupPassword, "success");
  }

  if (
    confirmPassword.value.trim() === "" ||
    confirmPassword.value !== signupPassword.value
  ) {
    setInputState(confirmPassword, "error");
    valid = false;
  } else {
    setInputState(confirmPassword, "success");
  }

  if (!termsCheck.checked) {
    valid = false;
  }

  if (!valid) {
    showMessage(
      signupMessage,
      "error",
      "Sesion Nueva Fallida",
      "Porfavor revisa las casillas vacias correctamente,  contraseña iguales, y acepta terminos y condiciones"
    );
    return;
  }

  try {
    showMessage(signupMessage, "info", "Creando Cuenta", "Please wait...");

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: `${firstName.value.trim()} ${lastName.value.trim()}`.trim(),
        email: signupEmail.value.trim(),
        password: signupPassword.value.trim(),
        role: "CUSTOMER",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      saveSession(data);
      showMessage(
        signupMessage,
        "success",
        "Cuenta Creada",
        "Tu cuenta ha sido creada correctamente. Redirigiendo..."
      );
      signupForm.reset();
      setTimeout(() => {
        resetInputs(inputs);
        window.location.href = "../dashboard/dashboard.html";
      }, 1500);
    } else {
      showMessage(
        signupMessage,
        "error",
        "Sesion Nueva Fallida",
        await readErrorMessage(response)
      );
    }
  } catch (error) {
    showMessage(
      signupMessage,
      "error",
      "Connection Error",
      "Unable to connect to server. Please make sure the backend is running on http://localhost:8080."
    );
    console.error("Signup error:", error);
  }
});
