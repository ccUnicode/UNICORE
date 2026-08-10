import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "../../lib/auth-client";
import {
  getLoginErrorMessage,
  validateLoginCredentials,
} from "./login-validation";

describe("validateLoginCredentials", () => {
  it("requires a student code", () => {
    assert.equal(
      validateLoginCredentials("", "valid-password"),
      "Ingresa tu código de estudiante.",
    );
  });

  it("requires a password", () => {
    assert.equal(
      validateLoginCredentials("20260001", ""),
      "Ingresa tu contraseña.",
    );
  });

  it("rejects passwords shorter than twelve characters", () => {
    assert.equal(
      validateLoginCredentials("20260001", "short"),
      "La contraseña debe tener al menos 12 caracteres.",
    );
  });

  it("accepts complete credentials", () => {
    assert.equal(
      validateLoginCredentials("20260001", "valid-password"),
      null,
    );
  });
});

describe("getLoginErrorMessage", () => {
  const cases = [
    {
      status: 400,
      message: "Revisa los datos ingresados e inténtalo nuevamente.",
    },
    {
      status: 401,
      message: "El código de estudiante o la contraseña no son correctos.",
    },
    {
      status: 403,
      message: "Tu cuenta no tiene acceso habilitado a UNICORE.",
    },
    {
      status: 429,
      message:
        "Has realizado demasiados intentos. Espera un momento y vuelve a intentarlo.",
    },
    {
      status: 500,
      message:
        "El servidor no pudo procesar la solicitud. Inténtalo nuevamente en unos minutos.",
    },
  ];

  for (const currentCase of cases) {
    it(`maps status ${currentCase.status} to a friendly message`, () => {
      assert.equal(
        getLoginErrorMessage(
          new ApiError("Backend error", currentCase.status),
        ),
        currentCase.message,
      );
    });
  }

  it("maps MEMBER_INACTIVE status 403 to an inactive account message", () => {
    assert.equal(
      getLoginErrorMessage(
        new ApiError("MEMBER_INACTIVE: Account inactive", 403),
      ),
      "Tu cuenta está inactiva porque no registras tareas o actividad activa asignada. Contacta a la Directiva o Presidencia para reactivarte.",
    );
  });

  it("maps DISABLED_READ_ONLY status 403 to a disabled read-only message", () => {
    assert.equal(
      getLoginErrorMessage(
        new ApiError("DISABLED_READ_ONLY: Read-only access only", 403),
      ),
      "Tu cuenta está inhabilitada y solo tiene acceso de lectura. No puedes realizar modificaciones.",
    );
  });

  it("maps network failures to a connection message", () => {
    assert.equal(
      getLoginErrorMessage(new TypeError("Failed to fetch")),
      "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.",
    );
  });

  it("uses a safe fallback for unexpected errors", () => {
    assert.equal(
      getLoginErrorMessage(new Error("Sensitive internal detail")),
      "No se pudo iniciar sesión. Inténtalo nuevamente.",
    );
  });
});
