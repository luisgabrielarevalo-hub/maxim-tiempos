"use client";

import { useState, type ClipboardEvent, type FormEvent } from "react";
import {
  MAX_AREA_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_FULL_NAME_LENGTH,
  normalizeEmployeeCode,
  type RegisterErrors,
  type RegisterField,
  type RegisterFormValues,
} from "@/lib/auth";

interface RegisterNotice {
  variant: "ok" | "mal";
  message: string;
}

const FIELD_CLASS =
  "w-full rounded-md border border-input bg-card px-3 py-2.5 font-sans text-[15px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35";

const LABEL_CLASS =
  "mb-1.5 block font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase";

const ERROR_CLASS = "mt-1.5 text-[13px] font-medium text-destructive";

const TOGGLE_CLASS =
  "absolute top-1/2 right-1.5 -translate-y-1/2 rounded px-2 py-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none";

const SECTION_CLASS =
  "border-t border-border px-5 py-6 first:border-t-0 sm:px-8 sm:py-7";

const INITIAL_VALUES: RegisterFormValues = {
  fullName: "",
  email: "",
  area: "",
  code: "",
  password: "",
  passwordConfirmation: "",
};

export default function RegisterForm() {
  const [values, setValues] = useState<RegisterFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [notice, setNotice] = useState<RegisterNotice | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  function handleChange(field: RegisterField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleCodeChange(value: string) {
    handleChange("code", normalizeEmployeeCode(value));
  }

  function handleCodePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();

    const input = event.currentTarget;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const pasted = event.clipboardData.getData("text");
    const nextValue = normalizeEmployeeCode(
      input.value.slice(0, start) + pasted + input.value.slice(end),
    );

    handleCodeChange(nextValue);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
              id="register-full-name"
              name="fullName"
              type="text"
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
              id="register-email"
              name="email"
              type="email"
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
            <label htmlFor="register-area" className={LABEL_CLASS}>
              Cargo
            </label>
            <input
              id="register-area"
              name="area"
              type="text"
              autoComplete="organization-title"
              maxLength={MAX_AREA_LENGTH}
              placeholder="Ej. Operaciones de pozo"
              value={values.area}
              onChange={(event) => handleChange("area", event.target.value)}
              aria-invalid={Boolean(errors.area)}
              aria-describedby={errors.area ? "register-area-error" : undefined}
              className={FIELD_CLASS}
            />
            {errors.area ? (
              <p id="register-area-error" className={ERROR_CLASS}>
                {errors.area}
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
          <input
            id="register-code"
            name="code"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="characters"
            maxLength={5}
            placeholder="AB12C"
            value={values.code}
            onChange={(event) => handleCodeChange(event.target.value)}
            onPaste={handleCodePaste}
            aria-invalid={Boolean(errors.code)}
            aria-describedby={errors.code ? "register-code-error" : undefined}
            className="w-[190px] max-w-full rounded-md border border-input bg-card px-3 py-2.5 text-center font-mono text-2xl font-medium tracking-[0.34em] text-foreground uppercase outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
          />
          {errors.code ? (
            <p id="register-code-error" className={ERROR_CLASS}>
              {errors.code}
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
                id="register-password"
                name="password"
                type={showPassword ? "text" : "password"}
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
                onClick={() => setShowPassword((visible) => !visible)}
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
                id="register-password-confirmation"
                name="passwordConfirmation"
                type={showPasswordConfirmation ? "text" : "password"}
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
                onClick={() =>
                  setShowPasswordConfirmation((visible) => !visible)
                }
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
          className="mt-5 w-full rounded-md bg-primary px-4 py-3.5 font-display text-[22px] leading-none tracking-[0.06em] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none"
        >
          Registrar empleado
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
