import { createServerClient } from "@supabase/ssr";
import type { JwtPayload } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

export interface SessionUpdate {
  response: NextResponse;
  claims: JwtPayload | null;
}

/** Refresca la sesión de Supabase, propaga las cookies y devuelve los claims. */
export async function updateSession(
  request: NextRequest,
): Promise<SessionUpdate> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });

          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    },
  );

  // No ejecutar código entre createServerClient y getClaims: aquí se refresca la sesión.
  const { data } = await supabase.auth.getClaims();

  return { response, claims: data?.claims ?? null };
}
