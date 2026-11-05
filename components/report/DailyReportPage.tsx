"use client";

import { useEffect, useState } from "react";
import {
  getTodayLocal,
  parseLocalDate,
  validateReport,
  type DailyReport,
  type DayStatus,
  type ReportErrors,
  type ReportField,
  type ReportFormValues,
} from "@/lib/report";
import { CalendarIcon } from "./icons";
import ReportCalendar from "./ReportCalendar";
import ReportForm from "./ReportForm";
import ReportHistory from "./ReportHistory";

const EMPTY_VALUES: ReportFormValues = {
  date: "",
  status: "",
  well: "",
  activity: "",
  notes: "",
};

export default function DailyReportPage() {
  const [today, setToday] = useState<string | null>(null);
  const [values, setValues] = useState<ReportFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<ReportErrors>({});
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [visibleMonth, setVisibleMonth] = useState<{ year: number; monthIndex: number } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const todayLocal = getTodayLocal();
    const todayDate = parseLocalDate(todayLocal);
    setToday(todayLocal);
    setValues((current) => ({ ...current, date: todayLocal }));
    setSelectedDate(todayLocal);
    setVisibleMonth({ year: todayDate.getFullYear(), monthIndex: todayDate.getMonth() });
  }, []);

  function handleChange(field: ReportField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setShowSuccess(false);
  }

  function handleStatusChange(status: DayStatus) {
    setValues((current) => ({
      ...current,
      status,
      well: status === "pozo" ? current.well : "",
      activity: status === "pozo" ? current.activity : "",
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.status;
      delete next.well;
      delete next.activity;
      return next;
    });
    setShowSuccess(false);
  }

  function handleSubmit(): ReportErrors {
    if (!today) return {};

    const nextErrors = validateReport(values, today);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setShowSuccess(false);
      return nextErrors;
    }

    const status = values.status as DayStatus;
    const report: DailyReport = {
      id: crypto.randomUUID(),
      date: values.date,
      status,
      well: status === "pozo" ? values.well.trim() : "",
      activity: status === "pozo" ? values.activity.trim() : "",
      notes: values.notes.trim(),
    };

    setReports((current) => [...current, report]);
    setSelectedDate(values.date);
    const reportDate = parseLocalDate(values.date);
    setVisibleMonth({ year: reportDate.getFullYear(), monthIndex: reportDate.getMonth() });
    setShowSuccess(true);

    return {};
  }

  function handleSelectDate(date: string) {
    const parsed = parseLocalDate(date);
    setSelectedDate(date);
    setVisibleMonth({ year: parsed.getFullYear(), monthIndex: parsed.getMonth() });
    setShowSuccess(false);
  }

  function handlePreviousMonth() {
    setVisibleMonth((current) =>
      current
        ? {
            year: current.monthIndex === 0 ? current.year - 1 : current.year,
            monthIndex: (current.monthIndex + 11) % 12,
          }
        : current,
    );
  }

  function handleNextMonth() {
    setVisibleMonth((current) =>
      current
        ? {
            year: current.monthIndex === 11 ? current.year + 1 : current.year,
            monthIndex: (current.monthIndex + 1) % 12,
          }
        : current,
    );
  }

  function handleToday() {
    const todayLocal = today ?? getTodayLocal();
    const parsed = parseLocalDate(todayLocal);
    setSelectedDate(todayLocal);
    setVisibleMonth({ year: parsed.getFullYear(), monthIndex: parsed.getMonth() });
    setShowSuccess(false);
  }

  function handleClear() {
    setValues({ ...EMPTY_VALUES, date: today ?? getTodayLocal() });
    setErrors({});
    setShowSuccess(false);
  }

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
        <section aria-label="Formulario del reporte" className="min-w-0">
          {today ? (
            <ReportForm
              values={values}
              errors={errors}
              today={today}
              showSuccess={showSuccess}
              onChange={handleChange}
              onStatusChange={handleStatusChange}
              onSubmit={handleSubmit}
              onClear={handleClear}
            />
          ) : (
            <div className="min-h-[560px] overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06)]" />
          )}
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

          <div className="pt-5">
            {today && visibleMonth ? (
              <>
                <ReportCalendar
                  reports={reports}
                  selectedDate={selectedDate}
                  today={today}
                  visibleMonth={visibleMonth}
                  onSelectDate={handleSelectDate}
                  onPreviousMonth={handlePreviousMonth}
                  onNextMonth={handleNextMonth}
                  onToday={handleToday}
                />
                <ReportHistory reports={reports} selectedDate={selectedDate} />
              </>
            ) : null}
          </div>
        </aside>
      </main>
    </>
  );
}
