export type DayStatus = "base" | "pozo" | "descanso" | "licencia";

export interface DailyReport {
  id: string;
  date: string;
  status: DayStatus;
  well: string;
  activity: string;
  notes: string;
  /** Código original de la hoja (DE, BA, ED…). Ausente en reportes manuales. */
  code?: string;
}

export type SheetDayStatus = DayStatus | "skip";

const SHEET_STATUS_CODES: Record<string, DayStatus> = {
  DE: "descanso",
  BA: "base",
  LI: "licencia",
};

/** Traduce el código de una casilla. Vacío y FE se omiten. */
export function statusFromSheetCode(raw: string): SheetDayStatus {
  const code = raw.trim().toUpperCase();

  if (!code || code === "FE") return "skip";

  return SHEET_STATUS_CODES[code] ?? "pozo";
}

/** Código canónico que se escribe en la hoja para cada estado. */
export const SHEET_CODE_BY_STATUS: Record<DayStatus, string> = {
  base: "BA",
  pozo: "ED",
  descanso: "DE",
  licencia: "LI",
};

/** Separa la actividad de las observaciones dentro de la nota de la hoja. */
export const SHEET_NOTE_SEPARATOR = " · ";

/** Nombre + número: SFRA099, SFRA 099, POZO-12. */
export const WELL_PATTERN = /\b[A-Z]{2,}(?:[ -]?\d{2,})\b/i;

export interface SheetNoteFields {
  well: string;
  activity: string;
  notes: string;
}

/**
 * Extrae pozo, actividad y observaciones de la nota de una celda. Solo los
 * días de pozo intentan reconocer el pozo; el resto de la nota se conserva
 * como observaciones.
 */
export function parseSheetNote(note: string, status: DayStatus | ""): SheetNoteFields {
  const text = note.trim();

  if (!text) return { well: "", activity: "", notes: "" };
  if (status !== "pozo") return { well: "", activity: "", notes: text };

  const match = WELL_PATTERN.exec(text);

  if (!match) return { well: "", activity: "", notes: text };

  const well = match[0].trim();
  const rest = `${text.slice(0, match.index)} ${text.slice(
    match.index + match[0].length,
  )}`
    .replace(/\s+/g, " ")
    .trim();
  const separator = rest.indexOf(SHEET_NOTE_SEPARATOR);

  if (separator === -1) {
    return { well, activity: rest, notes: "" };
  }

  return {
    well,
    activity: rest.slice(0, separator).trim(),
    notes: rest.slice(separator + SHEET_NOTE_SEPARATOR.length).trim(),
  };
}

/** Construye la nota de una celda en una sola línea. */
export function serializeSheetNote(fields: SheetNoteFields, status: DayStatus): string {
  const clean = (value: string) => value.replace(/\s+/g, " ").trim();
  const notes = clean(fields.notes);

  if (status !== "pozo") return notes;

  const base = [clean(fields.well), clean(fields.activity)].filter(Boolean).join(" ");

  return notes ? (base ? `${base}${SHEET_NOTE_SEPARATOR}${notes}` : notes) : base;
}

export interface ReportFormValues {
  date: string;
  status: DayStatus | "";
  well: string;
  activity: string;
  notes: string;
}

export type ReportField = "date" | "status" | "well" | "activity" | "notes";

export type ReportErrors = Partial<Record<ReportField, string>>;

export const DAY_STATUSES: readonly DayStatus[] = ["base", "pozo", "descanso", "licencia"];

export const REQUIRED_NOTES_STATUSES: readonly DayStatus[] = ["base"];

export const MAX_WELL_LENGTH = 60;
export const MAX_ACTIVITY_LENGTH = 500;
export const MAX_NOTES_LENGTH = 300;

export const STATUS_META: Record<DayStatus, { label: string; note: string }> = {
  base: { label: "En base", note: "Apoyo administrativo o logístico en instalaciones." },
  pozo: { label: "En pozo", note: "Operativo directo en el campo." },
  descanso: { label: "En descanso", note: "Día de descanso programado del turno." },
  licencia: { label: "En licencia", note: "Permiso, incapacidad o licencia autorizada." },
};

export const MONTH_NAMES: readonly string[] = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const WEEKDAY_LABELS: readonly string[] = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function getTodayLocal(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Fecha local anterior a `iso`, con cambio de mes y año. */
export function previousLocalDate(iso: string): string {
  const date = parseLocalDate(iso);
  date.setDate(date.getDate() - 1);
  return getTodayLocal(date);
}

/** Único rango de fechas reportable: hoy y ayer. */
export function getReportDateRange(today: string): { min: string; max: string } {
  return { min: previousLocalDate(today), max: today };
}

export function isAllowedReportDate(date: string, today: string): boolean {
  const { min, max } = getReportDateRange(today);
  return date === min || date === max;
}

export function formatLongDate(iso: string): string {
  const match = ISO_DATE_PATTERN.exec(iso || "");
  if (!match) return "";
  const [, year, month, day] = match;
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return "";
  return `${dayNumber} de ${MONTH_NAMES[monthNumber - 1]} de ${year}`;
}

export function parseLocalDate(iso: string): Date {
  const [year = 1970, month = 1, day = 1] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Días del mes (28–31). `monthIndex` es cero-based. */
export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Clave estable del mes: `YYYY-MM`. */
export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/**
 * Builds a 6 × 7 calendar matrix of local `YYYY-MM-DD` strings for the given
 * month. `monthIndex` is zero-based, matching the native `Date` API. Weeks
 * start on Monday.
 */
export function getMonthMatrix(year: number, monthIndex: number): string[][] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const offset = (firstOfMonth.getDay() + 6) % 7;

  return Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 7 }, (_, column) => {
      const date = new Date(year, monthIndex, 1 - offset + row * 7 + column);
      return getTodayLocal(date);
    }),
  );
}

export function validateReport(
  values: ReportFormValues,
  today: string = getTodayLocal(),
): ReportErrors {
  const errors: ReportErrors = {};
  const { min } = getReportDateRange(today);
  const well = values.well.trim();
  const activity = values.activity.trim();
  const notes = values.notes.trim();

  if (!values.date) {
    errors.date = "Indica la fecha que se está reportando.";
  } else if (!ISO_DATE_PATTERN.test(values.date)) {
    errors.date = "Usa el formato de calendario.";
  } else if (values.date > today) {
    errors.date = "La fecha no puede ser futura.";
  } else if (values.date < min) {
    errors.date = "Solo puedes reportar el día de hoy o el de ayer.";
  }

  if (!values.status || !DAY_STATUSES.includes(values.status)) {
    errors.status = "Selecciona dónde estuvo ese día.";
  }

  if (values.status === "pozo") {
    if (well.length === 0) {
      errors.well = "Indica en qué pozo estuvo.";
    } else if (well.length > MAX_WELL_LENGTH) {
      errors.well = "Máximo 60 caracteres. Describe el pozo en pocas palabras.";
    }

    if (activity.length === 0) {
      errors.activity = "Describe la actividad realizada.";
    } else if (activity.length > MAX_ACTIVITY_LENGTH) {
      errors.activity = "Máximo 500 caracteres. Sé breve y concreto.";
    }
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    errors.notes = "Máximo 300 caracteres.";
  } else if (
    values.status &&
    REQUIRED_NOTES_STATUSES.includes(values.status) &&
    notes.length === 0
  ) {
    errors.notes =
      "En base hay que indicar actividades realizadas y/o pozo y nombre de registro.";
  }

  return errors;
}

export function filterReportsByDate(reports: readonly DailyReport[], date: string): DailyReport[] {
  return reports.filter((report) => report.date === date);
}

export function formatMonthLabel(year: number, monthIndex: number): string {
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}
