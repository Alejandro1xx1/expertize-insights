import { NextResponse } from "next/server";
import { COOKIE_SESION } from "@/lib/auth";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.cookies.delete(COOKIE_SESION);
  return res;
}
