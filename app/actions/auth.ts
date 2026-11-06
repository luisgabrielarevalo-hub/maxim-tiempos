"use server";

import { redirect } from "next/navigation";

import {
  resolveRedirectPath,
  validateLogin,
  type LoginErrors,
  type LoginFormValues,
} from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface LoginActionState {
  ok: boolean;
  message: string;
  errors?: LoginErrors;
}

const REVIEW_MESSAGE = "Revisa los campos marcados.";
const INVALID_CREDENTIALS = "Correo o contraseña incorrectos.";
const EMAIL_NOT_CONFIRMED =
  "Tu correo aún no está confirmado. Solicita un enlace nuevo de registro.";
const RATE_LIMITED =
  "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
const GENERIC_ERROR = "No pudimos iniciar sesión. Intenta de nuevo.";

function mapSignInError(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return INVALID_CREDENTIALS;
    case "email_not_confirmed":
      return EMAIL_NOT_CONFIRMED;
    case "over_request_rate_limit":
      return RATE_LIMITED;
    default:
      return GENERIC_ERROR;
  }
}

export async function loginAction(
  values: LoginFormValues,
  redirectTo?: string,
): Promise<LoginActionState> {
  const normalized: LoginFormValues = {
    email: values.email.trim().toLowerCase(),
    password: values.password,
  };

  const errors = validateLogin(normalized);

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: REVIEW_MESSAGE, errors };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: normalized.email,
      password: normalized.password,
    });

    if (error) {
      return { ok: false, message: mapSignInError(error.code) };
    }
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }

  redirect(resolveRedirectPath(redirectTo));
}

export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // La sesión local se descarta igualmente al redirigir.
  }

  redirect("/login?signedOut=1");
}
