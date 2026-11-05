"use client";

import { useState, type FormEvent } from "react";
import type { LoginErrors } from "@/lib/auth";

interface LoginNotice {
  variant: "ok" | "mal";
  message: string;
}

const FIELD_CLASS =
  "w-full rounded-md border border-input bg-card px-3 py-2.5 font-mono text-[15px] tracking-[0.04em] text-foreground outline-none transition-[border-color,box-shadow] placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35";

const LABEL_CLASS =
  "mb-1.5 block font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase";

const ERROR_CLASS = "mt-1.5 text-[13px] font-medium text-destructive";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors] = useState<LoginErrors>({});
  const [notice] = useState<LoginNotice | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-[18px]">
        <label htmlFor="login-email" className={LABEL_CLASS}>
          Correo electrónico
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          maxLength={254}
          spellCheck={false}
          autoCapitalize="none"
          placeholder="nombre@empresa.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={FIELD_CLASS}
        />
        {errors.email ? <p className={ERROR_CLASS}>{errors.email}</p> : null}
      </div>

      <div className="mb-[18px] last:mb-0">
        <label htmlFor="login-password" className={LABEL_CLASS}>
          Contraseña
        </label>
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Tu contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${FIELD_CLASS} pr-[74px]`}
          />
          <button
            type="button"
            aria-pressed={showPassword}
            aria-controls="login-password"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded px-2 py-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none"
          >
            {showPassword ? "Ocultar" : "Ver"}
          </button>
        </div>
        {errors.password ? <p className={ERROR_CLASS}>{errors.password}</p> : null}
      </div>

      <button
        type="submit"
        className="mt-5 w-full rounded-md bg-primary px-4 py-3.5 font-display text-[22px] leading-none tracking-[0.06em] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none"
      >
        Ingresar
      </button>

      {notice ? (
        <p
          className={`mt-4 rounded-md border px-4 py-3.5 text-sm font-semibold ${
            notice.variant === "ok"
              ? "border-status-descanso/40 text-status-descanso"
              : "border-destructive/40 text-destructive"
          }`}
        >
          {notice.message}
        </p>
      ) : null}
    </form>
  );
}
