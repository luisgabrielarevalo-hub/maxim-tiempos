"use server";

import { getCurrentEmployee } from "@/lib/supabase/session";
import { loadEmployeeMonth, type MonthReports } from "@/lib/sheets/month";
import {
  loadEmployeeRestDays,
  type RestDaysSummary,
} from "@/lib/sheets/rest-days";
import {
  loadEmployeeDay,
  saveEmployeeDay,
  type DayReportResult,
} from "@/lib/sheets/day";
import {
  DAY_STATUSES,
  getTodayLocal,
  isAllowedReportDate,
  monthKey,
  parseLocalDate,
  validateReport,
  type DayStatus,
  type ReportErrors,
  type ReportFormValues,
} from "@/lib/report";

const INVALID_MONTH = "Mes no válido.";
const INVALID_DATE = "Fecha no válida.";
const OUT_OF_RANGE = "Solo puedes reportar el día de hoy o el de ayer.";
const NO_EMPLOYEE = "No encontramos tu ficha de empleado.";
const GENERIC_SAVE_ERROR = "No pudimos guardar el reporte. Intenta de nuevo.";

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function loadMonthReportsAction(
  year: number,
  monthIndex: number,
): Promise<MonthReports> {
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return { month: "", reports: [], message: INVALID_MONTH };
  }

  const employee = await getCurrentEmployee();

  if (!employee) {
    return {
      month: monthKey(year, monthIndex),
      reports: [],
      message: NO_EMPLOYEE,
    };
  }

  return loadEmployeeMonth(employee.employeeCode, year, monthIndex);
}

/** Lee el total de días a descansar del mes actual. Solo lectura, sin parámetros. */
export async function loadRestDaysAction(): Promise<RestDaysSummary> {
  try {
    const employee = await getCurrentEmployee();

    if (employee) {
      return loadEmployeeRestDays(employee.employeeCode);
    }

    const now = parseLocalDate(getTodayLocal());

    return {
      month: monthKey(now.getFullYear(), now.getMonth()),
      restDays: null,
      message: NO_EMPLOYEE,
    };
  } catch {
    return {
      month: "",
      restDays: null,
      message: "No pudimos leer la hoja de cálculo. Intenta de nuevo.",
    };
  }
}

/** Lee el día seleccionado del empleado autenticado. Solo lectura. */
export async function loadDayReportAction(date: string): Promise<DayReportResult> {
  if (!isValidIsoDate(date)) {
    return { date: "", report: null, message: INVALID_DATE };
  }

  try {
    const employee = await getCurrentEmployee();

    if (!employee) {
      return { date, report: null, message: NO_EMPLOYEE };
    }

    return loadEmployeeDay(employee.employeeCode, date);
  } catch {
    return {
      date,
      report: null,
      message: "No pudimos leer la hoja de cálculo. Intenta de nuevo.",
    };
  }
}

export interface SaveDayReportInput {
  date: string;
  status: DayStatus;
  well: string;
  activity: string;
  notes: string;
}

export interface SaveDayReportResult {
  report: DayReportResult["report"];
  errors: ReportErrors;
  message: string | null;
}

/** Guarda el día seleccionado. La fecha de referencia siempre es la del servidor. */
export async function saveDayReportAction(
  input: SaveDayReportInput,
): Promise<SaveDayReportResult> {
  if (!isValidIsoDate(input.date)) {
    return { report: null, errors: { date: INVALID_DATE }, message: null };
  }

  const serverToday = getTodayLocal();

  if (!isAllowedReportDate(input.date, serverToday)) {
    return { report: null, errors: { date: OUT_OF_RANGE }, message: null };
  }

  if (!DAY_STATUSES.includes(input.status)) {
    return {
      report: null,
      errors: { status: "Selecciona dónde estuvo ese día." },
      message: null,
    };
  }

  const values: ReportFormValues = {
    date: input.date,
    status: input.status,
    well: input.well,
    activity: input.activity,
    notes: input.notes,
  };
  const errors = validateReport(values, serverToday);

  if (Object.keys(errors).length > 0) {
    return { report: null, errors, message: null };
  }

  try {
    const employee = await getCurrentEmployee();

    if (!employee) {
      return { report: null, errors: {}, message: NO_EMPLOYEE };
    }

    const result = await saveEmployeeDay(employee.employeeCode, input.date, {
      status: input.status,
      well: input.well,
      activity: input.activity,
      notes: input.notes,
    });

    return {
      report: result.report,
      errors: {},
      message: result.message ?? (result.report ? null : GENERIC_SAVE_ERROR),
    };
  } catch {
    return { report: null, errors: {}, message: GENERIC_SAVE_ERROR };
  }
}
