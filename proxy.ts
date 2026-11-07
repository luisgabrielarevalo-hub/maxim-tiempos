import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_PATHS = ["/login", "/register"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function copySessionCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));

  const cacheControl = source.headers.get("Cache-Control");
  if (cacheControl) target.headers.set("Cache-Control", cacheControl);

  return target;
}

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);

  // Solo se redirigen navegaciones: un POST de Server Action debe llegar a su acción.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return response;
  }

  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(claims?.sub);

  if (!hasSession && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);

    return copySessionCookies(response, NextResponse.redirect(url, 307));
  }

  // Con sesión, las rutas de invitado (login y registro) llevan a la bitácora.
  if (hasSession && isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";

    return copySessionCookies(response, NextResponse.redirect(url, 307));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
