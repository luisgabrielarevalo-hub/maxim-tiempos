"use client";

import { useRef, useState } from "react";

import type { CurrentEmployee } from "@/lib/auth";
import {
  daysInMonth,
  monthKey,
  parseLocalDate,
  validateReport,
  type DailyReport,
  type DayStatus,
  type ReportErrors,
  type ReportField,
  type ReportFormValues,
} from "@/lib/report";
import { loadMonthReportsAction } from "@/app/actions/sheet";
import LogoutButton from "@/components/auth/LogoutButton";
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

interface DailyReportPageProps {
  employee: CurrentEmployee | null;
  today: string;
  initialMonth: { year: number; monthIndex: number };
  initialReports: DailyReport[];
  initialMessage: string | null;
}

export default function DailyReportPage({
  employee,
  today,
  initialMonth,
  initialReports,
  initialMessage,
}: DailyReportPageProps) {
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

          <div className="flex w-full items-center gap-4 sm:w-auto sm:justify-end">
            <div className="min-w-0 flex-1 text-left sm:flex-none sm:text-right">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase opacity-70">
                {employee ? `Código ${employee.employeeCode}` : "Sesión activa"}
              </p>
              {employee ? (
                <>
                  <p className="mt-1.5 font-display text-[22px] leading-none font-normal tracking-[0.02em]">
                    {employee.fullName}
                  </p>
                  <p className="mt-1 text-[12px] leading-tight opacity-75">
                    {employee.cargo}
                  </p>
                </>
              ) : null}
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <ReportWorkspace
        today={today}
        initialMonth={initialMonth}
        initialReports={initialReports}
        initialMessage={initialMessage}
      />
    </>
  );
}

interface ReportWorkspaceProps {
  today: string;
  initialMonth: { year: number; monthIndex: number };
  initialReports: DailyReport[];
  initialMessage: string | null;
}

function ReportWorkspace({
  today,
  initialMonth,
  initialReports,
  initialMessage,
}: ReportWorkspaceProps) {
  const todayDate = parseLocalDate(today);
  const [values, setValues] = useState<ReportFormValues>({ ...EMPTY_VALUES, date: today });
  const [errors, setErrors] = useState<ReportErrors>({});
  const [sheetReports, setSheetReports] = useState<DailyReport[]>(initialReports);
  const [sessionReports, setSessionReports] = useState<DailyReport[]>([]);
  const reports = [...sheetReports, ...sessionReports];
  const [selectedDate, setSelectedDate] = useState(() => {
    const isTodayInInitialMonth =
      todayDate.getFullYear() === initialMonth.year &&
      todayDate.getMonth() === initialMonth.monthIndex;

    if (isTodayInInitialMonth) return today;

    const lastDay = daysInMonth(initialMonth.year, initialMonth.monthIndex);

    return `${monthKey(initialMonth.year, initialMonth.monthIndex)}-${String(lastDay).padStart(2, "0")}`;
  });
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [loadedMonth, setLoadedMonth] = useState({
    key: monthKey(initialMonth.year, initialMonth.monthIndex),
    message: initialMessage,
  });
  const requestIdRef = useRef(0);

  async function requestMonth(next: { year: number; monthIndex: number }) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSheetReports([]);
    setIsLoadingMonth(true);

    try {
      const result = await loadMonthReportsAction(next.year, next.monthIndex);

      if (requestId !== requestIdRef.current) return;

      setSheetReports(result.reports);
      setLoadedMonth({ key: result.month, message: result.message });
    } catch {
      if (requestId !== requestIdRef.current) return;

      setSheetReports([]);
      setLoadedMonth({
        key: monthKey(next.year, next.monthIndex),
        message: "No pudimos leer la hoja de cálculo. Intenta de nuevo.",
      });
    } finally {
      if (requestId === requestIdRef.current) setIsLoadingMonth(false);
    }
  }

  function showMonth(next: { year: number; monthIndex: number }) {
    setVisibleMonth(next);
    setShowSuccess(false);

    const key = monthKey(next.year, next.monthIndex);

    if (key === loadedMonth.key) {
      // Invalida cualquier respuesta en vuelo: ya estamos en el mes correcto.
      requestIdRef.current += 1;
      setIsLoadingMonth(false);
      return;
    }

    void requestMonth(next);
  }

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
      delete next.notes;
      return next;
    });
    setShowSuccess(false);
  }

  function handleSubmit(): ReportErrors {
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

    setSessionReports((current) => [...current, report]);
    setSelectedDate(values.date);
    const reportDate = parseLocalDate(values.date);
    showMonth({ year: reportDate.getFullYear(), monthIndex: reportDate.getMonth() });
    setShowSuccess(true);

    return {};
  }

  function handleSelectDate(date: string) {
    const parsed = parseLocalDate(date);
    setSelectedDate(date);
    showMonth({ year: parsed.getFullYear(), monthIndex: parsed.getMonth() });
  }

  function handlePreviousMonth() {
    showMonth({
      year: visibleMonth.monthIndex === 0 ? visibleMonth.year - 1 : visibleMonth.year,
      monthIndex: (visibleMonth.monthIndex + 11) % 12,
    });
  }

  function handleNextMonth() {
    showMonth({
      year: visibleMonth.monthIndex === 11 ? visibleMonth.year + 1 : visibleMonth.year,
      monthIndex: (visibleMonth.monthIndex + 1) % 12,
    });
  }

  function handleToday() {
    setSelectedDate(today);
    showMonth({ year: todayDate.getFullYear(), monthIndex: todayDate.getMonth() });
  }

  function handleClear() {
    setValues({ ...EMPTY_VALUES, date: today });
    setErrors({});
    setShowSuccess(false);
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-7 px-4 pt-8 pb-16 min-[960px]:grid-cols-[minmax(0,1fr)_360px] min-[960px]:gap-9 min-[960px]:px-6 min-[960px]:pt-10">
      <section aria-label="Formulario del reporte" className="min-w-0">
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
            <h2 className="font-display text-3xl leading-none font-normal">Histórico de reportes</h2>
          </div>
          <CalendarIcon className="size-6 text-muted-foreground" />
        </header>

        <div className="pt-5">
          <ReportCalendar
            reports={reports}
            selectedDate={selectedDate}
            today={today}
            visibleMonth={visibleMonth}
            isLoading={isLoadingMonth}
            message={
              loadedMonth.key === monthKey(visibleMonth.year, visibleMonth.monthIndex)
                ? loadedMonth.message
                : null
            }
            onSelectDate={handleSelectDate}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
          />
          <ReportHistory reports={reports} selectedDate={selectedDate} />
        </div>
      </aside>
    </main>
  );
}
