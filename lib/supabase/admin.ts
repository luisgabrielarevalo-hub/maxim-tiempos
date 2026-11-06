import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Cliente con la secret key: omite RLS. Solo puede usarse en el servidor. */
export function createAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
