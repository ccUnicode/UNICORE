import { ApiError } from "../../lib/auth-client";

export function validateLoginCredentials(
  studentCode: string,
  password: string,
): string | null {
  if (!studentCode) {
    return "Ingresa tu código de estudiante.";
  }
  if (!password) {
    return "Ingresa tu contraseña.";
  }
  if (password.length < 12) {
    return "La contraseña debe tener al menos 12 caracteres.";
  }

  return null;
}

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "El código de estudiante o la contraseña no son correctos.";
    }
    if (error.status === 429) {
      return "Has realizado demasiados intentos. Espera un momento y vuelve a intentarlo.";
    }
    if (error.status === 400) {
      return "Revisa los datos ingresados e inténtalo nuevamente.";
    }
    if (error.status === 403) {
      if (error.code === "MEMBER_INACTIVE") {
        return "Tu cuenta está inactiva porque no registras tareas o actividad activa asignada. Contacta a la Directiva o Presidencia para reactivarte.";
      }
      if (error.code === "DISABLED_READ_ONLY") {
        return "Tu cuenta está inhabilitada y solo tiene acceso de lectura. No puedes realizar modificaciones.";
      }
      return "Tu cuenta no tiene acceso habilitado a UNICORE.";
    }
    if (error.status >= 500) {
      return "El servidor no pudo procesar la solicitud. Inténtalo nuevamente en unos minutos.";
    }
  }

  if (
    error instanceof Error &&
    /failed to fetch|networkerror|load failed/i.test(error.message)
  ) {
    return "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.";
  }

  return "No se pudo iniciar sesión. Inténtalo nuevamente.";
}
