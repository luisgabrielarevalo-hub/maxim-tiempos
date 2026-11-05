"use client";

import { useEffect, useState } from "react";
import { getTodayLocal } from "@/lib/report";
import { CalendarIcon } from "./icons";

export default function DailyReportPage() {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    setToday(getTodayLocal());
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        className="h-2.5 bg-[repeating-linear-gradient(135deg,var(--status-pozo)_0_12px,transparent_12px_24px)]"
      />

      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-x-8 gap-y-4 px-4 py-8">
          <div>
            <p className="font-mono text-[11px] tracking-[0.24em] uppercase opacity-70">
              Bitácora de personal
            </p>
            <h1 className="mt-1.5 font-display text-[clamp(44px,8vw,60px)] leading-[0.9] font-normal tracking-[0.02em]">
              Reporte diario de campo
            </h1>
          </div>
          <p className="max-w-xs text-[13px] leading-[1.4] opacity-75">
            Selecciona dónde estuvo la persona ese día. Si trabajó en pozo, la plantilla pide cuál
            fue y qué actividad hizo.
          </p>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-7 px-4 pt-8 pb-16 min-[960px]:grid-cols-[minmax(0,1fr)_360px] min-[960px]:gap-9 min-[960px]:px-6 min-[960px]:pt-10">
        <section
          aria-label="Formulario del reporte"
          className="min-h-[560px] overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
        >
          {today ? (
            <div className="p-6">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="mt-6 h-10 w-full max-w-xs rounded bg-muted" />
              <div className="mt-10 h-4 w-48 rounded bg-muted" />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="h-24 rounded bg-muted" />
                <div className="h-24 rounded bg-muted" />
                <div className="h-24 rounded bg-muted" />
                <div className="h-24 rounded bg-muted" />
              </div>
            </div>
          ) : null}
        </section>

        <aside
          aria-label="Histórico de reportes"
          className="min-w-0 min-[960px]:sticky min-[960px]:top-6 min-[960px]:self-start"
        >
          <header className="flex items-center justify-between gap-3 border-b border-border pb-5">
            <div>
              <p className="mb-2 font-mono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
                Bitácora de jornadas
              </p>
              <h2 className="font-display text-3xl leading-none font-normal">
                Histórico de reportes
              </h2>
            </div>
            <CalendarIcon className="size-6 text-muted-foreground" />
          </header>

          <div className="min-h-[420px] pt-5">
            <div className="h-4 w-56 rounded bg-muted" />
            <div className="mt-4 grid grid-cols-7 gap-2">
              {Array.from({ length: 42 }, (_, index) => (
                <div key={index} className="aspect-square rounded bg-muted/60" />
              ))}
            </div>
          </div>
        </aside>
      </main>
    </>
  );
}
