"use server";

import { redirect } from "next/navigation";

import {
  normalizeEmployeeCode,
  validateRegistration,
  type RegisterErrors,
  type RegisterFormValues,
} from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface RegisterActionState {
  ok: boolean;
  message: string;
  errors?: RegisterErrors;
}

const REVIEW_MESSAGE = "Revisa los campos marcados.";
const GENERIC_ERROR = "No pudimos completar el registro. Intenta de nuevo.";
const LOGIN_ERROR =
  "Tu cuenta se creó, pero no pudimos iniciar sesión. Ve a /login.";
const CODE_TAKEN = "Ese código ya está registrado.";
const EMAIL_TAKEN = "Ese correo ya está registrado.";

function duplicateState(field: "code" | "email"): RegisterActionState {
  return {
    ok: false,
    message: REVIEW_MESSAGE,
    errors: { [field]: field === "code" ? CODE_TAKEN : EMAIL_TAKEN },
  };
}

async function mapCreateUserError(
  admin: ReturnType<typeof createAdminClient>,
  values: RegisterFormValues,
  error: { code?: string; message?: string },
): Promise<RegisterActionState> {
  if (
    error.code === "email_exists" ||
    error.code === "user_already_exists" ||
    /already.*registered/i.test(error.message ?? "")
  ) {
    return duplicateState("email");
  }

  const { data: codeMatch } = await admin
    .from("employees")
    .select("id")
    .eq("employee_code", values.code)
    .maybeSingle();

  if (codeMatch) return duplicateState("code");

  const { data: emailMatch } = await admin
    .from("employees")
    .select("id")
    .eq("email", values.email)
    .maybeSingle();

  if (emailMatch) return duplicateState("email");

  return { ok: false, message: GENERIC_ERROR };
}

export async function registerEmployeeAction(
  values: RegisterFormValues,
): Promise<RegisterActionState> {
  const normalized: RegisterFormValues = {
    ...values,
    fullName: values.fullName.trim(),
    email: values.email.trim().toLowerCase(),
    cargo: values.cargo.trim(),
    code: normalizeEmployeeCode(values.code),
  };

  const errors = validateRegistration(normalized);

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: REVIEW_MESSAGE, errors };
  }

  try {
    const admin = createAdminClient();

    const { data: codeMatch, error: codeError } = await admin
      .from("employees")
      .select("id")
      .eq("employee_code", normalized.code)
      .maybeSingle();

    if (codeError) throw codeError;
    if (codeMatch) return duplicateState("code");

    const { data: emailMatch, error: emailError } = await admin
      .from("employees")
      .select("id")
      .eq("email", normalized.email)
      .maybeSingle();

    if (emailError) throw emailError;
    if (emailMatch) return duplicateState("email");

    const { error: createError } = await admin.auth.admin.createUser({
      email: normalized.email,
      password: normalized.password,
      email_confirm: true,
      user_metadata: {
        employee_code: normalized.code,
        full_name: normalized.fullName,
        cargo: normalized.cargo,
      },
    });

    if (createError) {
      return await mapCreateUserError(admin, normalized, createError);
    }
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalized.email,
      password: normalized.password,
    });

    if (signInError) {
      return { ok: false, message: LOGIN_ERROR };
    }
  } catch {
    return { ok: false, message: LOGIN_ERROR };
  }

  redirect("/");
}
