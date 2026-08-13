export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const AUTH_TOKEN_STORAGE_KEY = "unicore.auth.v1.accessToken";
export const READ_ONLY_STORAGE_KEY = "unicore.auth.v1.readOnly";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function getJson<T>(
  path: string,
  accessToken: string,
): Promise<T> {
  return authorizedJson<T>(path, accessToken);
}

export async function authorizedJson<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  if (
    typeof window !== "undefined" &&
    window.sessionStorage.getItem(READ_ONLY_STORAGE_KEY) === "true" &&
    method !== "GET"
  ) {
    throw new ApiError(
      "Tu cuenta está inhabilitada y solo permite consultar información histórica.",
      403,
      "DISABLED_READ_ONLY",
    );
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const { message, code } = await parseErrorResponse(response);
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const { message, code } = await parseErrorResponse(response);
    throw new ApiError(message, response.status, code);
  }

  return response.json() as Promise<T>;
}

interface ErrorResponseBody {
  message?: string | string[];
  code?: string;
}

async function parseErrorResponse(
  response: Response,
): Promise<{ message: string; code?: string }> {
  try {
    const payload = (await response.json()) as ErrorResponseBody;
    const message = Array.isArray(payload.message)
      ? payload.message.join(", ")
      : (payload.message ?? `Error ${response.status}`);
    return { message, code: payload.code };
  } catch {
    return { message: `Error ${response.status}` };
  }
}
