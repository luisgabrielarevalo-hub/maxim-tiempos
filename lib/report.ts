export type DayStatus = "base" | "pozo" | "descanso" | "licencia";

export interface DailyReport {
  id: string;
  date: string;
  status: DayStatus;
  well: string;
  activity: string;
  notes: string;
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

export const REQUIRED_NOTES_STATUSES: readonly DayStatus[] = ["base", "pozo"];

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
  const well = values.well.trim();
  const activity = values.activity.trim();
  const notes = values.notes.trim();

  if (!values.date) {
    errors.date = "Indica la fecha que se está reportando.";
  } else if (!ISO_DATE_PATTERN.test(values.date)) {
    errors.date = "Usa el formato de calendario.";
  } else if (values.date > today) {
    errors.date = "La fecha no puede ser futura.";
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
      "En base o en pozo hay que indicar actividades realizadas y/o pozo y nombre de registro.";
  }

  return errors;
}

export function filterReportsByDate(reports: readonly DailyReport[], date: string): DailyReport[] {
  return reports.filter((report) => report.date === date);
}

export function formatMonthLabel(year: number, monthIndex: number): string {
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}
