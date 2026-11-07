import "server-only";

import {
  MONTH_NAMES,
  SHEET_CODE_BY_STATUS,
  parseLocalDate,
  parseSheetNote,
  serializeSheetNote,
  statusFromSheetCode,
  type DayStatus,
} from "@/lib/report";
import {
  getRowCells,
  getValues,
  logSheetsError,
  updateCell,
} from "./client";
import {
  columnLetter,
  dayColumnIndexForDate,
  findEmployeeRow,
  monthTabForDate,
} from "./layout";

export interface DayFormData {
  date: string;
  status: DayStatus | "";
  well: string;
  activity: string;
  notes: string;
  /** Código actual en la hoja; `null` si la celda está vacía. */
  code: string | null;
}

export interface DayReportResult {
  date: string;
  report: DayFormData | null;
  message: string | null;
}

export interface SaveDayResult {
  report: DayFormData | null;
  message: string | null;
}

const GENERIC_ERROR = "No pudimos leer la hoja de cálculo. Intenta de nuevo.";
const GENERIC_SAVE_ERROR = "No pudimos guardar el reporte. Intenta de nuevo.";

/** Lee el valor y la nota de la celda de un día. Nunca lanza. */
export async function loadEmployeeDay(
  employeeCode: string,
  date: string,
): Promise<DayReportResult> {
  try {
    const monthIndex = parseLocalDate(date).getMonth();
    const row = await findEmployeeRow(employeeCode, monthIndex);

    if (row === null) {
      return {
        date,
        report: null,
        message: `No encontramos tu código en la hoja de ${MONTH_NAMES[monthIndex]}.`,
      };
    }

    const tab = monthTabForDate(date);
    const column = dayColumnIndexForDate(date);
    const cells = await getRowCells(`${tab}!${columnLetter(column)}${row}`);
    const cell = cells[0];

    if (!cell || (!cell.value && !cell.note)) {
      return { date, report: null, message: null };
    }

    const status = statusFromSheetCode(cell.value);
    const parsed = parseSheetNote(cell.note, status === "skip" ? "" : status);

    return {
      date,
      report: {
        date,
        status: status === "skip" ? "" : status,
        well: parsed.well,
        activity: parsed.activity,
        notes: parsed.notes,
        code: cell.value ? cell.value.trim().toUpperCase() : null,
      },
      message: null,
    };
  } catch (error) {
    logSheetsError(`loadEmployeeDay ${date}`, error);
    return { date, report: null, message: GENERIC_ERROR };
  }
}

/** Guarda el código y la nota de un día en una sola escritura. Nunca lanza. */
export async function saveEmployeeDay(
  employeeCode: string,
  date: string,
  values: {
    status: DayStatus;
    well: string;
    activity: string;
    notes: string;
  },
): Promise<SaveDayResult> {
  try {
    const monthIndex = parseLocalDate(date).getMonth();
    const row = await findEmployeeRow(employeeCode, monthIndex);

    if (row === null) {
      return {
        report: null,
        message: `No encontramos tu código en la hoja de ${MONTH_NAMES[monthIndex]}.`,
      };
    }

    const tab = monthTabForDate(date);
    const column = dayColumnIndexForDate(date);
    const current = await getValues(`${tab}!${columnLetter(column)}${row}`);
    const existingCode = (current[0]?.[0] ?? "").trim().toUpperCase();
    const existingStatus = statusFromSheetCode(existingCode);
    const code =
      existingCode && existingStatus === values.status
        ? existingCode
        : SHEET_CODE_BY_STATUS[values.status];

    const well = values.status === "pozo" ? values.well.trim() : "";
    const activity = values.status === "pozo" ? values.activity.trim() : "";
    const notes = values.notes.trim();
    const note = serializeSheetNote({ well, activity, notes }, values.status);

    await updateCell({ tab, row, column, value: code, note });

    return {
      report: {
        date,
        status: values.status,
        well,
        activity,
        notes,
        code,
      },
      message: null,
    };
  } catch (error) {
    logSheetsError(`saveEmployeeDay ${date}`, error);
    return { report: null, message: GENERIC_SAVE_ERROR };
  }
}
