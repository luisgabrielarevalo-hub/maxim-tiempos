"use client";

import {
  WEEKDAY_LABELS,
  formatLongDate,
  formatMonthLabel,
  getMonthMatrix,
  type DailyReport,
  type DayStatus,
} from "@/lib/report";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

const DOT_CLASS: Record<DayStatus, string> = {
  base: "bg-status-base",
  pozo: "bg-status-pozo",
  descanso: "bg-status-descanso",
  licencia: "bg-status-licencia",
};

interface ReportCalendarProps {
  reports: readonly DailyReport[];
  selectedDate: string;
  today: string;
  visibleMonth: { year: number; monthIndex: number };
  onSelectDate: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export default function ReportCalendar({
  reports,
  selectedDate,
  today,
  visibleMonth,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: ReportCalendarProps) {
  const { year, monthIndex } = visibleMonth;
  const matrix = getMonthMatrix(year, monthIndex);
  const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const monthCount = reports.filter((report) => report.date.startsWith(monthPrefix)).length;

  const statusByDate = new Map<string, DayStatus>();
  for (const report of reports) {
    statusByDate.set(report.date, report.status);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {monthCount} {monthCount === 1 ? "reporte este mes" : "reportes este mes"} ·{" "}
          {formatMonthLabel(year, monthIndex)}
        </span>
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPreviousMonth}
            aria-label="Mes anterior"
            className="inline-flex size-7 items-center justify-center rounded-md border border-input bg-card text-foreground transition-colors hover:bg-accent"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Mes siguiente"
            className="inline-flex size-7 items-center justify-center rounded-md border border-input bg-card text-foreground transition-colors hover:bg-accent"
          >
            <ChevronRightIcon />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-md border border-input bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Hoy
          </button>
        </div>
      </div>

      <table
        aria-label="Calendario de jornadas"
        className="my-3 mb-5 w-full table-fixed border-collapse"
      >
        <thead>
          <tr>
            {WEEKDAY_LABELS.map((label) => (
              <th
                key={label}
                scope="col"
                className="py-1.5 text-center font-mono text-[10px] font-medium text-muted-foreground uppercase"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((week) => (
            <tr key={week[0]}>
              {week.map((date) => {
                const dayNumber = Number(date.slice(8, 10));
                const inMonth = date.startsWith(monthPrefix);
                const isToday = date === today;
                const isSelected = date === selectedDate;
                const status = statusByDate.get(date);

                return (
                  <td key={date} className="p-0">
                    <button
                      type="button"
                      onClick={() => onSelectDate(date)}
                      aria-label={formatLongDate(date) || date}
                      aria-pressed={isSelected}
                      className={`relative aspect-square w-full rounded-md text-sm transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : `hover:bg-muted ${inMonth ? "text-foreground" : "text-muted-foreground/55"}`
                      } ${isToday ? "shadow-[inset_0_0_0_1px_var(--ring)]" : ""}`}
                    >
                      {dayNumber}
                      {status ? (
                        <span
                          aria-hidden="true"
                          className={`absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full ${DOT_CLASS[status]}`}
                        />
                      ) : null}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
