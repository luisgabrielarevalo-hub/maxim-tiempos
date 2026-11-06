import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/** Cliente de servidor con las cookies de la sesión. Crear uno por petición. */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Un Server Component no puede escribir cookies; el proxy refresca la sesión.
        }
      },
    },
  });
}
