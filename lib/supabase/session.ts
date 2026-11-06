import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { JwtPayload } from "@supabase/supabase-js";

import type { CurrentEmployee } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Claims del token de la petición actual; `null` si no hay sesión. */
export const getSessionClaims = cache(async (): Promise<JwtPayload | null> => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();

  return data?.claims ?? null;
});

/** Exige sesión: sin `sub` en los claims redirige a `/login`. */
export async function requireSession(): Promise<JwtPayload> {
  const claims = await getSessionClaims();

  if (!claims?.sub) redirect("/login");

  return claims;
}

/** Perfil del empleado autenticado; `null` si no hay sesión o no tiene fila. */
export const getCurrentEmployee = cache(
  async (): Promise<CurrentEmployee | null> => {
    const claims = await getSessionClaims();

    if (!claims?.sub) return null;

    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("employees")
      .select("employee_code, full_name, cargo")
      .eq("id", claims.sub)
      .maybeSingle();

    if (!data) return null;

    return {
      employeeCode: data.employee_code,
      fullName: data.full_name,
      cargo: data.cargo,
    };
  },
);
