export interface LoginFormValues {
  email: string;
  password: string;
}

export type LoginField = "email" | "password";

export type LoginErrors = Partial<Record<LoginField, string>>;

export interface AuthResult {
  ok: boolean;
  message: string;
}

export const MAX_EMAIL_LENGTH = 254;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateLogin(values: LoginFormValues): LoginErrors {
  const errors: LoginErrors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = "Escribe tu correo electrónico.";
  } else if (email.length > MAX_EMAIL_LENGTH) {
    errors.email = "Máximo 254 caracteres.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Escribe un correo electrónico válido.";
  }

  if (values.password.length === 0) {
    errors.password = "Escribe tu contraseña.";
  }

  return errors;
}

/** Stub de demostración: siempre responde ok. Se sustituirá por la llamada real. */
export function authenticate(_email: string, _password: string): AuthResult {
  return { ok: true, message: "Acceso correcto. Bienvenido(a)." };
}
