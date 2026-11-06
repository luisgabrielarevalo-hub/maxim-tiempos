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
export function authenticate(email: string, password: string): AuthResult {
  void email;
  void password;

  return { ok: true, message: "Acceso correcto. Bienvenido(a)." };
}

export interface RegisterFormValues {
  fullName: string;
  email: string;
  cargo: string;
  code: string;
  password: string;
  passwordConfirmation: string;
}

export interface EmployeeSummary {
  fullName: string;
  email: string;
  cargo: string;
  code: string;
}

export type RegisterField =
  | "fullName"
  | "email"
  | "cargo"
  | "code"
  | "password"
  | "passwordConfirmation";

export type RegisterErrors = Partial<Record<RegisterField, string>>;

export const MAX_FULL_NAME_LENGTH = 120;
export const MAX_CARGO_LENGTH = 80;
export const MIN_PASSWORD_LENGTH = 8;
export const EMPLOYEE_CODE_LENGTH = 5;
export const EMPLOYEE_CODE_PATTERN = /^[A-Z0-9]{5}$/;
export const EMPLOYEE_CODE_ALLOWED = /^[A-Z0-9]+$/;
export const EMPLOYEE_CODE_HAS_LETTER = /[A-Z]/;
export const EMPLOYEE_CODE_HAS_DIGIT = /[0-9]/;

/** Pasa a mayúsculas, quita lo que no sea A-Z/0-9 y recorta a 5. */
export function normalizeEmployeeCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, EMPLOYEE_CODE_LENGTH);
}

export function validateRegistration(
  values: RegisterFormValues,
): RegisterErrors {
  const errors: RegisterErrors = {};
  const fullName = values.fullName.trim();
  const email = values.email.trim();
  const cargo = values.cargo.trim();
  const code = values.code;

  if (!fullName) {
    errors.fullName = "Escribe el nombre completo.";
  } else if (fullName.length > MAX_FULL_NAME_LENGTH) {
    errors.fullName = "Máximo 120 caracteres.";
  }

  if (!email) {
    errors.email = "Escribe tu correo electrónico.";
  } else if (email.length > MAX_EMAIL_LENGTH) {
    errors.email = "Máximo 254 caracteres.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Escribe un correo electrónico válido.";
  }

  if (!cargo) {
    errors.cargo = "Escribe el cargo.";
  } else if (cargo.length > MAX_CARGO_LENGTH) {
    errors.cargo = "Máximo 80 caracteres.";
  }

  if (!code) {
    errors.code = "Escribe el código de 5 caracteres.";
  } else if (code.length !== EMPLOYEE_CODE_LENGTH) {
    errors.code = "El código debe tener 5 caracteres.";
  } else if (!EMPLOYEE_CODE_ALLOWED.test(code)) {
    errors.code = "El código solo admite letras y números.";
  } else if (
    !EMPLOYEE_CODE_HAS_LETTER.test(code) ||
    !EMPLOYEE_CODE_HAS_DIGIT.test(code)
  ) {
    errors.code = "El código debe mezclar letras y números.";
  }

  if (!values.password) {
    errors.password = "Escribe una contraseña.";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = "La contraseña debe tener 8 caracteres o más.";
  }

  if (!values.passwordConfirmation) {
    errors.passwordConfirmation = "Confirma la contraseña.";
  } else if (values.passwordConfirmation !== values.password) {
    errors.passwordConfirmation = "Las contraseñas no coinciden.";
  }

  return errors;
}

/** Stub de demostración: siempre responde ok. Se sustituirá por el guardado real. */
export function registerEmployee(employee: EmployeeSummary): AuthResult {
  void employee;

  return { ok: true, message: "Empleado registrado correctamente." };
}
