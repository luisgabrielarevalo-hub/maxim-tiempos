"use client";

interface RestDaysCardProps {
  restDays: string | null;
}

export default function RestDaysCard({ restDays }: RestDaysCardProps) {
  const hasValue = restDays !== null;

  return (
    <section
      aria-label="Total de días a descansar"
      className="mb-5 rounded-lg border border-border bg-card px-4 py-4 shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
    >
      <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        Total de días a descansar
      </p>
      <p aria-live="polite" className="mt-1.5 flex items-baseline gap-1.5">
        <span className="font-display text-[38px] leading-none font-normal tabular-nums">
          {restDays ?? "—"}
        </span>
        {hasValue ? (
          <span className="text-[13px] text-muted-foreground">días</span>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {hasValue ? "Según CUADRO DE PERSONAL" : "Sin dato en la hoja."}
      </p>
    </section>
  );
}
