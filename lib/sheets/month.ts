import "server-only";

import {
  MONTH_NAMES,
  daysInMonth,
  monthKey,
  statusFromSheetCode,
  type DailyReport,
} from "@/lib/report";
import { getRowCells } from "./client";
import {
  FIRST_DAY_COLUMN,
  columnLetter,
  findEmployeeRow,
  monthTabForMonth,
} from "./layout";

export interface MonthReports {
  /** `YYYY-MM`. */
  month: string;
  reports: DailyReport[];
  /** Aviso neutro para la interfaz; `null` cuando todo salió bien. */
  message: string | null;
}

const GENERIC_ERROR =
  "No pudimos leer la hoja de cálculo. Intenta de nuevo.";

export async function loadEmployeeMonth(
  employeeCode: string,
  year: number,
  monthIndex: number,
): Promise<MonthReports> {
  const month = monthKey(year, monthIndex);

  try {
    const row = await findEmployeeRow(employeeCode, monthIndex);

    if (row === null) {
      return {
        month,
        reports: [],
        message: `No encontramos tu código en la hoja de ${MONTH_NAMES[monthIndex]}.`,
      };
    }

    const tab = monthTabForMonth(monthIndex);
    const lastDay = daysInMonth(year, monthIndex);
    const lastColumn = columnLetter(FIRST_DAY_COLUMN + lastDay - 1);
    const cells = await getRowCells(`${tab}!C${row}:${lastColumn}${row}`);

    const reports: DailyReport[] = [];

    for (let day = 1; day <= lastDay; day += 1) {
      const cell = cells[day - 1];

      if (!cell) continue;

      const status = statusFromSheetCode(cell.value);

      if (status === "skip") continue;

      const date = `${month}-${String(day).padStart(2, "0")}`;

      reports.push({
        id: `sheet:${date}`,
        date,
        status,
        code: cell.value.trim().toUpperCase(),
        well: "",
        activity: "",
        notes: cell.note,
      });
    }

    return {
      month,
      reports,
      message:
        reports.length === 0
          ? `No hay días registrados para ti en ${MONTH_NAMES[monthIndex]}.`
          : null,
    };
  } catch {
    return { month, reports: [], message: GENERIC_ERROR };
  }
}
