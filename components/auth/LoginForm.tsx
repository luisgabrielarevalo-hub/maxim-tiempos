"use client";

import { useRef, useState, type FormEvent } from "react";

import { loginAction } from "@/app/actions/auth";
import {
  MAX_EMAIL_LENGTH,
  validateLogin,
  type LoginErrors,
  type LoginField,
} from "@/lib/auth";
import { isNextFlowError } from "@/lib/next-errors";

interface LoginFormProps {
  nextPath: string;
  signedOut?: boolean;
}

interface LoginNotice {
  variant: "ok" | "mal";
  message: string;
}

const SIGNED_OUT_NOTICE: LoginNotice = {
  variant: "ok",
  message: "Cerraste sesión correctamente.",
};

const GENERIC_ERROR = "No pudimos iniciar sesión. Intenta de nuevo.";

const FIELD_CLASS =
  "w-full rounded-md border border-input bg-card px-3 py-2.5 font-mono text-[15px] tracking-[0.04em] text-foreground outline-none transition-[border-color,box-shadow] placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35";

const LABEL_CLASS =
  "mb-1.5 block font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase";

const ERROR_CLASS = "mt-1.5 text-[13px] font-medium text-destructive";

export default function LoginForm({
  nextPath,
  signedOut = false,
}: LoginFormProps) {
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [notice, setNotice] = useState<LoginNotice | null>(
    signedOut ? SIGNED_OUT_NOTICE : null,
  );

  function clearFieldFeedback(field: LoginField) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setNotice(null);
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    clearFieldFeedback("email");
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    clearFieldFeedback("password");
  }

  function focusFirstError(nextErrors: LoginErrors) {
    if (nextErrors.email) {
      emailInputRef.current?.focus();
    } else if (nextErrors.password) {
      passwordInputRef.current?.focus();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    const nextErrors = validateLogin({ email, password });
    setErrors(nextErrors);
    setNotice(null);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginAction({ email, password }, nextPath);

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

      setNotice({ variant: "mal", message: GENERIC_ERROR });
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-[18px]">
        <label htmlFor="login-email" className={LABEL_CLASS}>
          Correo electrónico
        </label>
        <input
          ref={emailInputRef}
          id="login-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          maxLength={MAX_EMAIL_LENGTH}
          spellCheck={false}
          autoCapitalize="none"
          placeholder="nombre@empresa.com"
          value={email}
          onChange={(event) => handleEmailChange(event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className={FIELD_CLASS}
        />
        {errors.email ? (
          <p id="login-email-error" className={ERROR_CLASS}>
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className="mb-[18px] last:mb-0">
        <label htmlFor="login-password" className={LABEL_CLASS}>
          Contraseña
        </label>
        <div className="relative">
          <input
            ref={passwordInputRef}
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Tu contraseña"
            value={password}
            onChange={(event) => handlePasswordChange(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            className={`${FIELD_CLASS} pr-[74px]`}
          />
          <button
            type="button"
            aria-pressed={showPassword}
            aria-controls="login-password"
            onClick={() => {
              setShowPassword((visible) => !visible);
              clearFieldFeedback("password");
            }}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded px-2 py-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none"
          >
            {showPassword ? "Ocultar" : "Ver"}
          </button>
        </div>
        {errors.password ? (
          <p id="login-password-error" className={ERROR_CLASS}>
            {errors.password}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-5 w-full rounded-md bg-primary px-4 py-3.5 font-display text-[22px] leading-none tracking-[0.06em] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none disabled:opacity-60"
      >
        {isLoading ? "Verificando…" : "Ingresar"}
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
    </form>
  );
}
