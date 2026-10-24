export const COOKIE_SESION = "ei_sesion";

/** Token de sesión derivado de APP_PASSWORD: si cambias la contraseña, todas las sesiones se cierran. */
export async function tokenSesion(password: string): Promise<string> {
  const data = new TextEncoder().encode(`expertize-insights:v1:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function igualSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
