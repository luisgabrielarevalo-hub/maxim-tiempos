import {
  getValues,
  updateValues,
  type SheetProperties,
  getSpreadsheetMetadata,
} from "./client";

/**
 * Layout de "CUADRO DE PERSONAL <año>":
 *
 *   A  = id del empleado en el sistema anterior (ObjectId de Mongo)
 *   B  = nombre completo; una fila con solo B es el encabezado de una sección
 *   C… = un día por columna (C = día 1 … AG = día 31)
 *   Fila 5 = día de la semana, fila 6 = número de día
 *
 * Códigos usados en la hoja (leyenda de la fila 2):
 *   V = vacaciones · F = festivo · I = incapacidad · D = día · N = noche
 *   DE = descanso · L = licencia · B = base · OD = (sin definir)
 *   ED / EN / FE / GN / GD / BA = códigos operativos (sin definir)
 */

export const MONTH_TABS = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
] as const;

/** Primera columna con días (C). */
export const FIRST_DAY_COLUMN = 3;

/** Primera fila con empleados (las 6 primeras son cabecera). */
export const EMPLOYEE_FIRST_ROW = 7;

/** Última fila que se revisa al buscar empleados. */
export const EMPLOYEE_LAST_ROW = 200;

/** Columna "TOTAL DE DIAS A DESCANSAR" (AT) de la pestaña del mes. */
export const TOTAL_REST_DAYS_COLUMN = 46;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface SheetEmployee {
  /** Fila real en la pestaña del mes. */
  row: number;
  /** Id del sistema anterior (columna A). */
  sheetId: string;
  /** Nombre completo (columna B). */
  name: string;
  /** Sección a la que pertenece (INGENIEROS, OPERADOR, AUXILIARES…). */
  section: string;
}

function parseIsoDate(iso: string): { year: number; month: number; day: number } {
  const match = ISO_DATE_PATTERN.exec(iso);

  if (!match) {
    throw new Error(`Fecha inválida: "${iso}". Usa YYYY-MM-DD.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) {
    throw new Error(`Mes inválido en "${iso}".`);
  }

  if (day < 1 || day > 31) {
    throw new Error(`Día inválido en "${iso}".`);
  }

  return { year, month, day };
}

/** Pestaña del mes para una fecha local `YYYY-MM-DD`. */
export function monthTabForDate(iso: string): string {
  const { month } = parseIsoDate(iso);
  return MONTH_TABS[month - 1];
}

/** Pestaña del mes: 0 = enero … 11 = diciembre. */
export function monthTabForMonth(monthIndex: number): string {
  const tab = MONTH_TABS[monthIndex];

  if (!tab) throw new Error(`Mes inválido: ${monthIndex}.`);

  return tab;
}

/** Convierte un índice de columna (1 = A) a letras. */
export function columnLetter(column: number): string {
  if (!Number.isInteger(column) || column < 1) {
    throw new Error(`Columna inválida: ${column}.`);
  }

  let remaining = column;
  let label = "";

  while (remaining > 0) {
    const remainder = (remaining - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    remaining = Math.floor((remaining - 1) / 26);
  }

  return label;
}

/** Índice de columna (1 = A) del día de una fecha. */
export function dayColumnIndexForDate(iso: string): number {
  const { day } = parseIsoDate(iso);
  return FIRST_DAY_COLUMN + day - 1;
}

/** Columna del día (C = 1 … AG = 31). */
export function dayColumnForDate(iso: string): string {
  return columnLetter(dayColumnIndexForDate(iso));
}

/** Rango A1 de la celda de un empleado en un día. */
export function dayCell(employee: SheetEmployee, iso: string): string {
  return `${monthTabForDate(iso)}!${dayColumnForDate(iso)}${employee.row}`;
}

/** Rango A1 de la celda del total de días a descansar de una fila. */
export function totalRestDaysCell(tab: string, row: number): string {
  return `${tab}!${columnLetter(TOTAL_REST_DAYS_COLUMN)}${row}`;
}

/** Normaliza nombres para comparar sin acentos ni mayúsculas. */
export function normalizeEmployeeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Convierte las filas A:B de un mes en empleados. Las filas con nombre pero sin
 * id son encabezados de sección.
 */
export function parseEmployees(rows: string[][]): SheetEmployee[] {
  const employees: SheetEmployee[] = [];
  let section = "";

  rows.forEach((row, index) => {
    const sheetId = (row[0] ?? "").trim();
    const name = (row[1] ?? "").trim();

    if (!sheetId && name) {
      section = name;
      return;
    }

    if (!sheetId) return;

    employees.push({
      row: EMPLOYEE_FIRST_ROW + index,
      sheetId,
      name,
      section,
    });
  });

  return employees;
}

/** Empleados de la pestaña del mes, en orden de fila. */
export async function listEmployees(iso: string): Promise<SheetEmployee[]> {
  const tab = monthTabForDate(iso);
  const rows = await getValues(
    `${tab}!A${EMPLOYEE_FIRST_ROW}:B${EMPLOYEE_LAST_ROW}`,
  );

  return parseEmployees(rows);
}

/** Fila del empleado cuyo código está en la columna A; `null` si no aparece. */
export async function findEmployeeRow(
  employeeCode: string,
  monthIndex: number,
): Promise<number | null> {
  const tab = monthTabForMonth(monthIndex);
  const rows = await getValues(
    `${tab}!A${EMPLOYEE_FIRST_ROW}:A${EMPLOYEE_LAST_ROW}`,
  );
  const code = employeeCode.trim().toUpperCase();
  const index = rows.findIndex(
    (row) => (row[0] ?? "").trim().toUpperCase() === code,
  );

  return index === -1 ? null : EMPLOYEE_FIRST_ROW + index;
}

/**
 * Busca un empleado por id de la hoja o por nombre (sin distinguir acentos ni
 * mayúsculas). Lanza si no existe.
 */
export async function findEmployee(
  employee: string,
  iso: string,
): Promise<SheetEmployee> {
  const employees = await listEmployees(iso);
  const trimmed = employee.trim();
  const key = normalizeEmployeeKey(trimmed);

  const match =
    employees.find((candidate) => candidate.sheetId === trimmed) ??
    employees.find((candidate) => normalizeEmployeeKey(candidate.name) === key);

  if (!match) {
    throw new Error(
      `No encontré a "${employee}" en la pestaña ${monthTabForDate(iso)}.`,
    );
  }

  return match;
}

/** Código escrito en el día del empleado ("" si la celda está vacía). */
export async function readDayCode(
  employee: SheetEmployee,
  iso: string,
): Promise<string> {
  const values = await getValues(dayCell(employee, iso));
  return (values[0]?.[0] ?? "").trim();
}

/** Escribe el código del día y devuelve el rango actualizado. */
export async function writeDayCode(
  employee: SheetEmployee,
  iso: string,
  code: string,
): Promise<string> {
  const range = dayCell(employee, iso);
  const result = await updateValues(range, [[code]]);
  return result.updatedRange;
}

/** Pestañas del libro con su id interno. */
export async function listTabs(): Promise<SheetProperties[]> {
  const metadata = await getSpreadsheetMetadata();
  return (metadata.sheets ?? []).map((sheet) => sheet.properties);
}
