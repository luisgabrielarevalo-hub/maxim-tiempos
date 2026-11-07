import "server-only";

import { getTodayLocal, monthKey, parseLocalDate } from "@/lib/report";
import { getValues, logSheetsError } from "./client";
import { findEmployeeRow, monthTabForMonth, totalRestDaysCell } from "./layout";

export interface RestDaysSummary {
  /** `YYYY-MM` del mes consultado (siempre el mes actual del servidor). */
  month: string;
  /** Valor formateado para la interfaz; `null` si la celda está vacía. */
  restDays: string | null;
  /** Aviso neutro; `null` cuando se pudo leer la celda. */
  message: string | null;
}

const GENERIC_ERROR = "No pudimos leer la hoja de cálculo. Intenta de nuevo.";
const NOT_FOUND = "No encontramos tu código en la hoja.";

export function formatRestDays(raw: string): string | null {
  const text = raw.trim();

  if (!text) return null;

  const value = Number(text);

  if (!Number.isFinite(value)) return text;

  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(
    value,
  );
}

export async function loadEmployeeRestDays(
  employeeCode: string,
  today: string = getTodayLocal(),
): Promise<RestDaysSummary> {
  const date = parseLocalDate(today);
  const monthIndex = date.getMonth();
  const month = monthKey(date.getFullYear(), monthIndex);

  try {
    const row = await findEmployeeRow(employeeCode, monthIndex);

    if (row === null) return { month, restDays: null, message: NOT_FOUND };

    const values = await getValues(
      totalRestDaysCell(monthTabForMonth(monthIndex), row),
    );

    return {
      month,
      restDays: formatRestDays(values[0]?.[0] ?? ""),
      message: null,
    };
  } catch (error) {
    logSheetsError("loadEmployeeRestDays", error);
    return { month, restDays: null, message: GENERIC_ERROR };
  }
}
