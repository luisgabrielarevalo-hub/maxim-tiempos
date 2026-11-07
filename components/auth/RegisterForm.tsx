"use client";

import { useRef, useState, type FormEvent } from "react";

import { registerEmployeeAction } from "@/app/register/actions";
import {
  EMPLOYEE_CODE_HAS_DIGIT,
  EMPLOYEE_CODE_HAS_LETTER,
  EMPLOYEE_CODE_PATTERN,
  MAX_CARGO_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_FULL_NAME_LENGTH,
  normalizeEmployeeCode,
  validateRegistration,
  type RegisterErrors,
  type RegisterField,
  type RegisterFormValues,
} from "@/lib/auth";
import { isNextFlowError } from "@/lib/next-errors";

interface RegisterFormProps {
  initialCode: string;
  hasCodeParam: boolean;
}

interface RegisterNotice {
  variant: "ok" | "mal";
  message: string;
}

const FIELD_CLASS =
  "w-full rounded-md border border-input bg-card px-3 py-[11px] font-sans text-[15px] leading-[normal] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35";

const LABEL_CLASS =
  "mb-1.5 block font-mono text-[10px] leading-[normal] tracking-[0.18em] text-muted-foreground uppercase";

const ERROR_CLASS =
  "mt-1.5 text-[13px] leading-[normal] font-medium text-destructive";

const TOGGLE_CLASS =
  "absolute top-1/2 right-1.5 -translate-y-1/2 rounded px-2 py-1.5 font-mono text-[10px] leading-[normal] tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none";

const SECTION_CLASS =
  "border-t border-border px-5 py-6 first:border-t-0 sm:px-8 sm:py-7";

const INITIAL_VALUES: RegisterFormValues = {
  fullName: "",
  email: "",
  cargo: "",
  code: "",
  password: "",
  passwordConfirmation: "",
};

export default function RegisterForm({
  initialCode,
  hasCodeParam,
}: RegisterFormProps) {
  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const cargoInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const passwordConfirmationInputRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<RegisterFormValues>(() => ({
    ...INITIAL_VALUES,
    code: normalizeEmployeeCode(initialCode),
  }));
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [notice, setNotice] = useState<RegisterNotice | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const hasValidLink =
    hasCodeParam &&
    EMPLOYEE_CODE_PATTERN.test(values.code) &&
    EMPLOYEE_CODE_HAS_LETTER.test(values.code) &&
    EMPLOYEE_CODE_HAS_DIGIT.test(values.code);

  function clearFieldFeedback(field: RegisterField) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setNotice(null);
  }

  function handleChange(field: RegisterField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    clearFieldFeedback(field);
  }

  function focusFirstError(nextErrors: RegisterErrors) {
    if (nextErrors.fullName) {
      fullNameInputRef.current?.focus();
    } else if (nextErrors.email) {
      emailInputRef.current?.focus();
    } else if (nextErrors.cargo) {
      cargoInputRef.current?.focus();
    } else if (nextErrors.code) {
      codeInputRef.current?.focus();
    } else if (nextErrors.password) {
      passwordInputRef.current?.focus();
    } else if (nextErrors.passwordConfirmation) {
      passwordConfirmationInputRef.current?.focus();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading || !hasValidLink) return;

    const nextErrors = validateRegistration(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      setNotice({ variant: "mal", message: "Revisa los campos marcados." });
      return;
    }

    setNotice(null);
    setIsLoading(true);

    try {
      const result = await registerEmployeeAction(values);

      if (!result.ok) {
        setErrors(result.errors ?? {});
        setNotice({ variant: "mal", message: result.message });
        if (result.errors) focusFirstError(result.errors);
      }

      setIsLoading(false);
    } catch (error) {
      // El redirect del servidor rechaza con un error interno de Next aunque
      // la navegación ya esté en curso; no se muestra como fallo.
      if (isNextFlowError(error)) return;

      setNotice({
        variant: "mal",
        message: "No pudimos completar el registro. Intenta de nuevo.",
      });
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
    >
      <section aria-labelledby="register-personal-title" className={SECTION_CLASS}>
        <header className="mb-5 flex items-baseline gap-3">
          <span className="font-mono text-[11px] text-status-pozo">01</span>
          <h2
            id="register-personal-title"
            className="font-display text-[26px] leading-none font-normal tracking-[0.03em]"
          >
            Datos del empleado
          </h2>
        </header>

        <div className="grid gap-x-[18px] sm:grid-cols-2">
          <div className="mb-[18px] last:mb-0">
            <label htmlFor="register-full-name" className={LABEL_CLASS}>
              Nombre completo
            </label>
            <input
              ref={fullNameInputRef}
              id="register-full-name"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              maxLength={MAX_FULL_NAME_LENGTH}
              placeholder="Ej. María Fernanda López"
              value={values.fullName}
              onChange={(event) => handleChange("fullName", event.target.value)}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "register-full-name-error" : undefined}
              className={FIELD_CLASS}
            />
            {errors.fullName ? (
              <p id="register-full-name-error" className={ERROR_CLASS}>
                {errors.fullName}
              </p>
            ) : null}
          </div>

          <div className="mb-[18px] last:mb-0">
            <label htmlFor="register-email" className={LABEL_CLASS}>
              Correo electrónico
            </label>
            <input
              ref={emailInputRef}
              id="register-email"
              name="email"
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              maxLength={MAX_EMAIL_LENGTH}
              spellCheck={false}
              autoCapitalize="none"
              placeholder="Ej. mlopez@empresa.com"
              value={values.email}
              onChange={(event) => handleChange("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "register-email-error" : undefined}
              className={FIELD_CLASS}
            />
            {errors.email ? (
              <p id="register-email-error" className={ERROR_CLASS}>
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="mb-[18px] last:mb-0">
            <label htmlFor="register-cargo" className={LABEL_CLASS}>
              Cargo
            </label>
            <input
              ref={cargoInputRef}
              id="register-cargo"
              name="cargo"
              type="text"
              required
              autoComplete="organization-title"
              maxLength={MAX_CARGO_LENGTH}
              placeholder="Ej. Operaciones de pozo"
              value={values.cargo}
              onChange={(event) => handleChange("cargo", event.target.value)}
              aria-invalid={Boolean(errors.cargo)}
              aria-describedby={errors.cargo ? "register-cargo-error" : undefined}
              className={FIELD_CLASS}
            />
            {errors.cargo ? (
              <p id="register-cargo-error" className={ERROR_CLASS}>
                {errors.cargo}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="register-code-title" className={SECTION_CLASS}>
        <header className="mb-5 flex items-baseline gap-3">
          <span className="font-mono text-[11px] text-status-pozo">02</span>
          <h2
            id="register-code-title"
            className="font-display text-[26px] leading-none font-normal tracking-[0.03em]"
          >
            Código de empleado
          </h2>
        </header>

        <div className="rounded-lg border border-[color-mix(in_oklab,var(--status-pozo)_45%,var(--border))] bg-[color-mix(in_oklab,var(--status-pozo)_8%,var(--card))] px-4 py-[18px]">
          <label htmlFor="register-code" className={LABEL_CLASS}>
            Código alfanumérico de 5 caracteres
          </label>
          <p
            id="register-code-help"
            className="mb-2 font-sans text-[13px] leading-[normal] text-muted-foreground"
          >
            Este código viene incluido en el enlace de registro.
          </p>
          <input
            ref={codeInputRef}
            id="register-code"
            name="code"
            type="text"
            readOnly
            aria-readonly="true"
            value={values.code}
            aria-invalid={Boolean(errors.code)}
            aria-describedby={
              errors.code
                ? "register-code-help register-code-error"
                : "register-code-help"
            }
            className="w-[190px] max-w-full cursor-not-allowed rounded-md border border-input bg-muted px-3 py-2.5 text-center font-mono text-2xl leading-[normal] font-medium tracking-[0.34em] text-muted-foreground uppercase outline-none"
          />
          {errors.code ? (
            <p id="register-code-error" className={ERROR_CLASS}>
              {errors.code}
            </p>
          ) : null}
          {!hasValidLink ? (
            <p
              role="alert"
              className="mt-2 text-[13px] leading-[normal] font-medium text-destructive"
            >
              El enlace no incluye un código de empleado válido. Solicita un
              enlace nuevo.
            </p>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="register-access-title" className={SECTION_CLASS}>
        <header className="mb-5 flex items-baseline gap-3">
          <span className="font-mono text-[11px] text-status-pozo">03</span>
          <h2
            id="register-access-title"
            className="font-display text-[26px] leading-none font-normal tracking-[0.03em]"
          >
            Cuenta de acceso
          </h2>
        </header>

        <div className="grid gap-x-[18px] sm:grid-cols-2">
          <div className="mb-[18px] last:mb-0">
            <label htmlFor="register-password" className={LABEL_CLASS}>
              Contraseña
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                id="register-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={values.password}
                onChange={(event) => handleChange("password", event.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "register-password-error" : undefined}
                className={`${FIELD_CLASS} pr-[74px]`}
              />
              <button
                type="button"
                aria-pressed={showPassword}
                aria-controls="register-password"
                onClick={() => {
                  setShowPassword((visible) => !visible);
                  clearFieldFeedback("password");
                }}
                className={TOGGLE_CLASS}
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
            {errors.password ? (
              <p id="register-password-error" className={ERROR_CLASS}>
                {errors.password}
              </p>
            ) : null}
          </div>

          <div className="mb-[18px] last:mb-0">
            <label htmlFor="register-password-confirmation" className={LABEL_CLASS}>
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                ref={passwordConfirmationInputRef}
                id="register-password-confirmation"
                name="passwordConfirmation"
                type={showPasswordConfirmation ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Repite la contraseña"
                value={values.passwordConfirmation}
                onChange={(event) =>
                  handleChange("passwordConfirmation", event.target.value)
                }
                aria-invalid={Boolean(errors.passwordConfirmation)}
                aria-describedby={
                  errors.passwordConfirmation
                    ? "register-password-confirmation-error"
                    : undefined
                }
                className={`${FIELD_CLASS} pr-[74px]`}
              />
              <button
                type="button"
                aria-pressed={showPasswordConfirmation}
                aria-controls="register-password-confirmation"
                onClick={() => {
                  setShowPasswordConfirmation((visible) => !visible);
                  clearFieldFeedback("passwordConfirmation");
                }}
                className={TOGGLE_CLASS}
              >
                {showPasswordConfirmation ? "Ocultar" : "Ver"}
              </button>
            </div>
            {errors.passwordConfirmation ? (
              <p id="register-password-confirmation-error" className={ERROR_CLASS}>
                {errors.passwordConfirmation}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className={SECTION_CLASS}>
        <button
          type="submit"
          disabled={isLoading || !hasValidLink}
          className="mt-5 w-full rounded-md bg-primary px-4 pt-3.5 pb-3 font-display text-[22px] leading-none tracking-[0.06em] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Registrando…" : "Registrar empleado"}
        </button>

        {notice ? (
          <p
            role="status"
            className={`mt-4 rounded-md border px-4 py-3.5 text-sm font-semibold ${
              notice.variant === "ok"
                ? "border-success/40 text-success"
                : "border-destructive/40 text-destructive"
            }`}
          >
            {notice.message}
          </p>
        ) : null}
      </section>
    </form>
  );
}
