import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, igualSeguro, tokenSesion } from "@/lib/auth";

// Protege toda la app (páginas y API) con la contraseña APP_PASSWORD.
export async function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  const cookie = req.cookies.get(COOKIE_SESION)?.value ?? "";
  if (password && cookie && igualSeguro(cookie, await tokenSesion(password))) {
    return NextResponse.next();
  }
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado. Vuelve a ingresar la contraseña." }, { status: 401 });
  }
  const login = new URL("/login", req.url);
  login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|hero\\.).*)"],
};
