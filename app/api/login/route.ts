import { NextResponse } from "next/server";
import { COOKIE_SESION, igualSeguro, tokenSesion } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { error: "Falta configurar APP_PASSWORD en las variables de entorno." },
      { status: 500 },
    );
  }
  let intento = "";
  try {
    intento = String((await req.json()).password ?? "");
  } catch {
    /* cuerpo vacío */
  }
  // Pequeña pausa para frenar intentos por fuerza bruta.
  await new Promise((r) => setTimeout(r, 400));
  if (!igualSeguro(await tokenSesion(intento), await tokenSesion(password))) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESION, await tokenSesion(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
