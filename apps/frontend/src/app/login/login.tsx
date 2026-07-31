"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ApiError,
  AUTH_TOKEN_STORAGE_KEY,
  postJson,
} from "@/lib/auth-client";

type LoginResponse = {
  accessToken: string;
};

function Logo() {
  return (
    <div className="h-[50px] w-[179px] overflow-hidden bg-[#191822]">
      <Image
        src="/unicore-logo.png"
        alt="UNICORE"
        width={261}
        height={73}
        priority
        className="h-[50px] w-[179px] object-cover"
      />
    </div>
  );
}

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.75" />
      {visible && <path d="m4 4 16 16" />}
    </svg>
  );
}

function getLoginErrorMessage(error: unknown): string {
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

function LoginErrorNotice({ message }: { message: string }) {
  return (
    <div
      id="login-error"
      role="alert"
      aria-live="assertive"
      className="rounded-lg border border-[#8c424c]/60 bg-[#29171c] px-4 py-3.5"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#c85d69]/15 text-[#eb8a94]">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5" />
            <path d="M12 16.5h.01" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-[#ffd9dd]">
            No pudimos iniciar sesión
          </p>
          <p className="mt-1 text-xs leading-5 text-[#eeb8be]">{message}</p>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const router = useRouter();
  const [studentCode, setStudentCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const storedToken = window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (storedToken) {
      router.replace("/dashboard");
    }
  }, [router]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");

    const normalizedStudentCode = studentCode.trim();
    if (!normalizedStudentCode) {
      setLoginError("Ingresa tu código de estudiante.");
      return;
    }
    if (!password) {
      setLoginError("Ingresa tu contraseña.");
      return;
    }
    if (password.length < 12) {
      setLoginError("La contraseña debe tener al menos 12 caracteres.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await postJson<LoginResponse>("/auth/login", {
        studentCode: normalizedStudentCode,
        password,
      });
      window.sessionStorage.setItem(
        AUTH_TOKEN_STORAGE_KEY,
        response.accessToken,
      );
      router.replace("/dashboard");
    } catch (currentError) {
      setLoginError(getLoginErrorMessage(currentError));
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#191822] text-white lg:bg-[#060610]">
      <section className="grid min-h-screen lg:grid-cols-[minmax(390px,42%)_1fr]">
        <aside className="relative hidden overflow-hidden border-r border-[#2d2d37] bg-[#191822] px-12 py-10 lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-12">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1 bg-[#4067c9]"
          />
          <Logo />

          <div className="max-w-[460px]">
            <h1 className="text-[44px] font-bold leading-[1.16] tracking-[-0.04em] xl:text-[52px]">
              Organiza áreas, equipos y{" "}
              <span className="text-[#7898ef]">proyectos.</span>
            </h1>
            <p className="mt-6 max-w-[400px] text-[15px] leading-7 text-white/55">
              Consulta tu trabajo y colabora con tu equipo desde un mismo
              espacio.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-white/35">
            <span className="h-px w-8 bg-[#4067c9]" />
            <span>UNICORE</span>
          </div>
        </aside>

        <div className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-24">
          <div className="w-full max-w-[430px]">
            <div className="mb-16 lg:hidden">
              <Logo />
            </div>

            <header className="border-l-[3px] border-[#4067c9] pl-5">
              <h2 className="text-[38px] font-bold leading-tight tracking-[-0.04em] sm:text-[42px]">
                Iniciar sesión
              </h2>
            </header>

            <form className="mt-10 space-y-6" onSubmit={submit} noValidate>
              {loginError && <LoginErrorNotice message={loginError} />}

              <label className="block">
                <span className="text-[13px] font-semibold text-white/75">
                  Código de estudiante
                </span>
                <input
                  autoComplete="username"
                  value={studentCode}
                  onChange={(event) => {
                    setStudentCode(event.target.value);
                    if (loginError) setLoginError("");
                  }}
                  required
                  maxLength={20}
                  placeholder="Ej. 20260001"
                  className="mt-2.5 h-[54px] w-full rounded-lg border border-[#34343e] bg-[#15151f] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 hover:border-[#4a4a56] focus:border-[#5f82df] focus:ring-2 focus:ring-[#4067c9]/20"
                />
              </label>

              <div>
                <label
                  htmlFor="login-password"
                  className="text-[13px] font-semibold text-white/75"
                >
                  Contraseña
                </label>
                <span className="relative mt-2.5 block">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (loginError) setLoginError("");
                    }}
                    required
                    minLength={12}
                    maxLength={128}
                    placeholder="Ingresa tu contraseña"
                    className="h-[54px] w-full rounded-lg border border-[#34343e] bg-[#15151f] px-4 pr-14 text-sm text-white outline-none transition-colors placeholder:text-white/25 hover:border-[#4a4a56] focus:border-[#5f82df] focus:ring-2 focus:ring-[#4067c9]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-md text-white/45 transition-colors hover:bg-white/5 hover:text-white/80 focus-visible:bg-white/5 focus-visible:text-white focus-visible:outline-none"
                    aria-label={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                    aria-pressed={showPassword}
                  >
                    <PasswordVisibilityIcon visible={showPassword} />
                  </button>
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex h-[54px] w-full items-center justify-center rounded-lg border border-[#6282d7] bg-[#4067c9] text-sm font-semibold text-white transition-colors hover:border-[#7898ef] hover:bg-[#5278d5] active:bg-[#385db9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7898ef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#060610] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Ingresando…" : "Ingresar"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
