"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CurrentEmployee } from "@/lib/auth";
import {
  daysInMonth,
  isAllowedReportDate,
  monthKey,
  parseLocalDate,
  previousLocalDate,
  validateReport,
  type DailyReport,
  type DayStatus,
  type ReportErrors,
  type ReportField,
  type ReportFormValues,
} from "@/lib/report";
import {
  loadDayReportAction,
  loadMonthReportsAction,
  loadRestDaysAction,
  saveDayReportAction,
} from "@/app/actions/sheet";
import LogoutButton from "@/components/auth/LogoutButton";
import { CalendarIcon } from "./icons";
import ReportCalendar from "./ReportCalendar";
import ReportForm from "./ReportForm";
import ReportHistory from "./ReportHistory";
import RestDaysCard from "./RestDaysCard";

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
  initialRestDays: string | null;
}

export default function DailyReportPage({
  employee,
  today,
  initialMonth,
  initialReports,
  initialMessage,
  initialRestDays,
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
        initialRestDays={initialRestDays}
      />
    </>
  );
}

interface ReportWorkspaceProps {
  today: string;
  initialMonth: { year: number; monthIndex: number };
  initialReports: DailyReport[];
  initialMessage: string | null;
  initialRestDays: string | null;
}

function ReportWorkspace({
  today,
  initialMonth,
  initialReports,
  initialMessage,
  initialRestDays,
}: ReportWorkspaceProps) {
  const todayDate = parseLocalDate(today);
  const yesterday = previousLocalDate(today);
  const [values, setValues] = useState<ReportFormValues>({ ...EMPTY_VALUES, date: today });
  const [errors, setErrors] = useState<ReportErrors>({});
  const [sheetReports, setSheetReports] = useState<DailyReport[]>(initialReports);
  const reports = sheetReports;
  const [restDays, setRestDays] = useState<string | null>(initialRestDays);
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
  const [isLoadingDay, setIsLoadingDay] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dayMessage, setDayMessage] = useState<string | null>(null);
  const [dayLoadFailed, setDayLoadFailed] = useState(false);
  const [existingCode, setExistingCode] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadedMonth, setLoadedMonth] = useState({
    key: monthKey(initialMonth.year, initialMonth.monthIndex),
    message: initialMessage,
  });
  const requestIdRef = useRef(0);
  const dayRequestIdRef = useRef(0);

  const loadDay = useCallback(async (date: string) => {
    const requestId = dayRequestIdRef.current + 1;
    dayRequestIdRef.current = requestId;
    setIsLoadingDay(true);
    setDayMessage(null);
    setDayLoadFailed(false);

    try {
      const result = await loadDayReportAction(date);

      if (requestId !== dayRequestIdRef.current) return;

      if (result.report) {
        setValues({
          date: result.report.date,
          status: result.report.status,
          well: result.report.well,
          activity: result.report.activity,
          notes: result.report.notes,
        });
        setExistingCode(result.report.code);
      } else {
        setValues({ ...EMPTY_VALUES, date });
        setExistingCode(null);
      }

      setDayMessage(result.message);
      setDayLoadFailed(result.message !== null);
      setErrors({});
    } catch {
      if (requestId !== dayRequestIdRef.current) return;

      setValues({ ...EMPTY_VALUES, date });
      setExistingCode(null);
      setDayMessage("No pudimos leer la hoja de cálculo. Intenta de nuevo.");
      setDayLoadFailed(true);
    } finally {
      if (requestId === dayRequestIdRef.current) setIsLoadingDay(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadDay(today));
  }, [loadDay, today]);

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

  async function refreshRestDays() {
    try {
      const result = await loadRestDaysAction();
      setRestDays(result.restDays);
    } catch {
      // Conserva el último valor conocido; el guardado ya se confirmó.
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

  function handleDateChange(date: string) {
    setValues((current) => ({ ...current, date }));
    setErrors((current) => {
      if (!current.date) return current;
      const next = { ...current };
      delete next.date;
      return next;
    });
    setShowSuccess(false);
    setSaveError(null);

    if (isAllowedReportDate(date, today)) {
      void loadDay(date);
      return;
    }

    setExistingCode(null);
    setDayMessage(null);
    setDayLoadFailed(false);
  }

  function handleChange(field: ReportField, value: string) {
    if (field === "date") {
      handleDateChange(value);
      return;
    }

    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setShowSuccess(false);
    setSaveError(null);
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
    setSaveError(null);
  }

  async function handleSubmit(): Promise<ReportErrors> {
    const clientErrors = validateReport(values, today);

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setShowSuccess(false);
      return clientErrors;
    }

    setIsSaving(true);
    setSaveError(null);
    setShowSuccess(false);

    try {
      const result = await saveDayReportAction({
        date: values.date,
        status: values.status as DayStatus,
        well: values.well,
        activity: values.activity,
        notes: values.notes,
      });

      if (Object.keys(result.errors).length > 0) {
        setErrors(result.errors);
        return result.errors;
      }

      if (!result.report) {
        setSaveError(result.message ?? "No pudimos guardar el reporte. Intenta de nuevo.");
        return {};
      }

      const saved = result.report;
      const savedDate = parseLocalDate(saved.date);
      const savedMonth = {
        year: savedDate.getFullYear(),
        monthIndex: savedDate.getMonth(),
      };

      setErrors({});
      setValues({
        date: saved.date,
        status: saved.status,
        well: saved.well,
        activity: saved.activity,
        notes: saved.notes,
      });
      setExistingCode(saved.code);
      setSelectedDate(saved.date);
      setShowSuccess(true);
      setDayMessage(null);
      setDayLoadFailed(false);
      setVisibleMonth(savedMonth);
      void requestMonth(savedMonth);
      void refreshRestDays();

      return {};
    } catch {
      setSaveError("No pudimos guardar el reporte. Intenta de nuevo.");
      return {};
    } finally {
      setIsSaving(false);
    }
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
    setValues({ ...EMPTY_VALUES, date: values.date });
    setErrors({});
    setShowSuccess(false);
    setSaveError(null);
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-7 px-4 pt-8 pb-16 min-[960px]:grid-cols-[minmax(0,1fr)_360px] min-[960px]:gap-9 min-[960px]:px-6 min-[960px]:pt-10">
      <section aria-label="Formulario del reporte" className="min-w-0">
        <ReportForm
          values={values}
          errors={errors}
          today={today}
          yesterday={yesterday}
          showSuccess={showSuccess}
          isSaving={isSaving}
          isLoadingDay={isLoadingDay}
          dayMessage={dayMessage}
          dayLoadFailed={dayLoadFailed}
          existingCode={existingCode}
          saveError={saveError}
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
          <RestDaysCard restDays={restDays} />
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
