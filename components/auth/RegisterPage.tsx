import type { ReactNode } from "react";

export default function RegisterPage({ children }: { children?: ReactNode }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="h-2.5 bg-[repeating-linear-gradient(135deg,var(--status-pozo)_0_12px,transparent_12px_24px)]"
      />

      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto w-full max-w-[680px] px-4 pt-8 pb-[26px]">
          <p className="font-mono text-[11px] leading-[normal] tracking-[0.24em] uppercase opacity-70">
            Bitácora de personal · Registro
          </p>
          <h1 className="mt-1.5 font-display text-[clamp(40px,8vw,54px)] leading-[0.9] font-normal tracking-[0.02em]">
            Registro del empleado
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pt-8 pb-12">
        {children}
      </main>
    </>
  );
}
