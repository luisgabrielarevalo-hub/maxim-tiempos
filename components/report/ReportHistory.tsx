"use client";

import {
  DAY_STATUSES,
  STATUS_META,
  filterReportsByDate,
  formatLongDate,
  type DailyReport,
} from "@/lib/report";
import { CalendarIcon } from "./icons";
import { STATUS_DOT_CLASS } from "./statusClasses";

interface ReportHistoryProps {
  reports: readonly DailyReport[];
  selectedDate: string;
}

export default function ReportHistory({ reports, selectedDate }: ReportHistoryProps) {
  const dayReports = filterReportsByDate(reports, selectedDate);

  return (
    <>
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border pb-5">
        {DAY_STATUSES.map((status) => (
          <span
            key={status}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span className={`size-2 rounded-full ${STATUS_DOT_CLASS[status]}`} />
            {STATUS_META[status].label}
          </span>
        ))}
      </div>

      <section aria-live="polite">
        <h3 className="mt-5 font-display text-2xl font-normal">
          {formatLongDate(selectedDate) || "Jornadas reportadas"}
        </h3>

        {dayReports.length === 0 ? (
          <div className="flex items-center gap-3 py-7 text-sm text-muted-foreground">
            <CalendarIcon className="size-6 shrink-0" />
            <p className="m-0">No hay registro para este día.</p>
          </div>
        ) : (
          dayReports.map((report) => (
            <article key={report.id} className="mt-5 border-l-2 border-border pl-4">
              <p className="flex items-center gap-2 font-semibold">
                <span className={`size-2 rounded-full ${STATUS_DOT_CLASS[report.status]}`} />
                {STATUS_META[report.status].label}
                {report.code ? (
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    · {report.code}
                  </span>
                ) : null}
              </p>

              {report.well ? (
                <>
                  <p className="mt-2 mb-0.5 text-xs text-muted-foreground">Pozo</p>
                  <p className="break-words whitespace-pre-wrap">{report.well}</p>
                </>
              ) : null}

              {report.activity ? (
                <>
                  <p className="mt-2 mb-0.5 text-xs text-muted-foreground">Actividad realizada</p>
                  <p className="break-words whitespace-pre-wrap">{report.activity}</p>
                </>
              ) : null}

              <p className="mt-2 mb-0.5 text-xs text-muted-foreground">Observaciones</p>
              <p className="break-words whitespace-pre-wrap">
                {report.notes || "Sin observaciones"}
              </p>
            </article>
          ))
        )}

        <p className="mt-5 text-xs text-muted-foreground">Fuente: CUADRO DE PERSONAL</p>
      </section>
    </>
  );
}
