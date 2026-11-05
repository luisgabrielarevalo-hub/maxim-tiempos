import type { ReactNode } from "react";

export default function LoginPage({ children }: { children?: ReactNode }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="h-2.5 bg-[repeating-linear-gradient(135deg,var(--status-pozo)_0_12px,transparent_12px_24px)]"
      />

      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto w-full max-w-[640px] px-4 pt-8 pb-[26px]">
          <p className="font-mono text-[11px] tracking-[0.24em] uppercase opacity-70">
            Bitácora de personal · Acceso
          </p>
          <h1 className="mt-1.5 font-display text-[clamp(40px,8vw,54px)] leading-[0.9] font-normal tracking-[0.02em]">
            Ingreso del empleado
          </h1>
          <p className="mt-2.5 max-w-[420px] text-[13px] leading-[1.45] opacity-75">
            Ingresa con tu correo electrónico y contraseña para reportar tu jornada del día.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[640px] flex-1 px-4 pt-8 pb-12">
        <section
          aria-labelledby="login-credentials-title"
          className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
        >
          <div className="border-t border-border px-5 py-6 first:border-t-0 sm:px-8 sm:py-7">
            <header className="mb-5 flex items-baseline gap-3">
              <span className="font-mono text-[11px] text-status-pozo">01</span>
              <h2
                id="login-credentials-title"
                className="font-display text-[26px] leading-none font-normal tracking-[0.03em]"
              >
                Credenciales
              </h2>
            </header>
            {children}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card px-4 py-3.5 text-center font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        Plantilla de acceso · Uso interno del personal
      </footer>
    </>
  );
}
