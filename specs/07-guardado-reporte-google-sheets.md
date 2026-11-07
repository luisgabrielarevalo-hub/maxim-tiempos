# SPEC 07 — Guardado del reporte en Google Sheets

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (reporte diario), SPEC 06 (carga del mes desde Google Sheets)
> **Reemplaza:** la decisión del SPEC 06 de mantener la app en solo lectura y la persistencia de sesión del SPEC 01.
> **Fecha:** 2026-11-06
> **Objetivo:** guardar en la hoja **CUADRO DE PERSONAL 2026** el reporte del formulario, permitir únicamente hoy y ayer en el campo **Fecha del reporte**, y cargar en el formulario los datos que ya existan en esos días para editarlos.

---

## Por qué existe este spec

El SPEC 06 conectó la lectura del mes: al entrar a `/` y al cambiar de mes, la app lee la fila del empleado autenticado y muestra sus días en el calendario y el histórico. Pero el formulario sigue trabajando en memoria: los reportes generados se guardan en `sessionReports`, no se escriben en la hoja y se pierden al recargar. Además, el campo **Fecha del reporte** acepta cualquier fecha pasada, aunque la operación real solo permite reportar la jornada de hoy o la de ayer.

Este spec cierra el ciclo: el formulario carga el día seleccionado desde la hoja, permite editarlo y guarda el resultado en la misma celda. La celda conserva el código del estado y la nota; la nota transporta el pozo, la actividad y las observaciones con una convención simple y legible para quien revise la hoja.

No hay cambios de esquema ni migraciones. La identidad sigue saliendo de `public.employees.employee_code` y de la sesión de Supabase.

---

## Decisiones tomadas

- **Fecha permitida:** solo `hoy` y `ayer`, calculados con la fecha del servidor (`getTodayLocal()`). `app/page.tsx` calcula `serverToday` y lo pasa a la pantalla; el input usa `min=ayer` y `max=hoy` con esa fecha y `saveDayReportAction` vuelve a validar contra su propio `getTodayLocal()`. La zona horaria del despliegue debe ser la de la operación (America/Bogota).
- **Calendario lateral:** sigue navegando meses y mostrando el histórico completo. Seleccionar un día allí **no** cambia la fecha del formulario; solo el campo **Fecha del reporte** carga datos en el formulario.
- **Lectura del día:** nueva acción `loadDayReportAction(date)` que lee una sola celda (valor + nota) y devuelve estado, pozo, actividad, observaciones y código actual.
- **Escritura:** `saveDayReportAction` valida sesión, fecha y reglas del formulario; `saveEmployeeDay` escribe el valor y la nota en una sola llamada `spreadsheets.batchUpdate` con `updateCells`.
- **Código de la celda:** si el día ya tiene un código que traduce al mismo estado, se conserva (`ED`, `EN`, `V`…). Si cambia el estado, se escribe el canónico: `base = BA`, `pozo = ED`, `descanso = DE`, `licencia = LI`.
- **Nota de la hoja:**
  - **Pozo:** `pozo actividad` y, si hay observaciones, `pozo actividad · observaciones`.
  - **Base, descanso y licencia:** solo observaciones.
- **Lectura de la nota:**
  - Solo para días de **pozo** se busca el primer token con letras + dígitos y espacio opcional (`SFRA099`, `SFRA 099`, `POZO-12`).
  - Si hay pozo: el resto es **Actividad realizada**; si aparece ` · `, lo que sigue es **Observaciones**.
  - Si no hay pozo: toda la nota va a **Observaciones** y el campo **¿En qué pozo estuvo?** queda pendiente.
  - Para estados distintos de pozo: toda la nota va a **Observaciones**.
- **Estado en memoria:** desaparece `sessionReports`. El reporte guardado se refleja en `sheetReports` y se recarga el mes de la fecha guardada.
- **Textos:** botón **Guardar reporte**; mientras guarda, **Guardando…**; confirmación **Reporte guardado**. Cualquier edición posterior oculta la confirmación y el botón sigue siendo **Guardar reporte**.
- **Errores:** mensajes genéricos en español. Nunca se expone el error crudo de Google.
- **Sin caché:** cada carga de día y cada guardado leen la hoja de nuevo.
- **Sin confirmación de sobrescritura:** el formulario muestra los datos existentes antes de editar; el usuario ve qué va a reemplazar. **Limpiar** no borra la hoja.

---

## Alcance

**Incluye:**

- Lectura de un día concreto (valor y nota) desde la pestaña del mes.
- Carga automática del día seleccionado al entrar a `/` y al cambiar la fecha.
- Escritura atómica del código y la nota en la celda del día.
- Validación de fecha en cliente y servidor contra la fecha del servidor: solo hoy y ayer.
- Preservación del código existente cuando el estado no cambia.
- Serialización y parseo de la nota para recuperar pozo, actividad y observaciones.
- Server Actions `loadDayReportAction` y `saveDayReportAction`, protegidas por la sesión.
- Cambios de interfaz en `ReportForm`, `StatusSelector` y `DailyReportPage`.
- Actualización inmediata del calendario y del histórico después de guardar.
- Eliminación de `sessionReports`.
- Comando de diagnóstico `npm run sheets:check -- write ... --note ...` y lectura de la nota en `read`.
- Actualización de `AGENTS.md`, `README.md` y notas de reemplazo en los SPEC 01 y 06.
- Verificación con `npx tsc --noEmit`, `npm run lint`, `npm run build`, Playwright y capturas en `.playwright-mcp/`.

**Fuera de alcance:**

- Persistir los reportes en Supabase.
- Editar días distintos de hoy y ayer.
- Agregar columnas nuevas a la hoja para pozo, actividad u observaciones.
- Cambiar la traducción de códigos del SPEC 06 (`L` y `B` siguen leyéndose como pozo).
- Confirmación modal antes de sobrescribir, historial de cambios o auditoría.
- Bloqueo optimista o control de concurrencia entre dos sesiones.
- Roles, permisos por cargo o visibilidad de otros empleados.
- Notificaciones, polling o actualización en tiempo real.
- Pruebas automatizadas (no hay suite configurada).

---

## Contrato de datos

### Fechas

- `today` es la fecha del servidor en formato `YYYY-MM-DD`, calculada con `getTodayLocal()`.
- `yesterday` es `today - 1`, con cambio de mes y año.
- `app/page.tsx` calcula `serverToday` y lo pasa a `DailyReportPage`; el cliente no usa la fecha del navegador para decidir el rango.
- `saveDayReportAction` no recibe `today`: calcula `serverToday` con `getTodayLocal()` y exige que `date` sea `serverToday` o `previousLocalDate(serverToday)`.
- La zona horaria del servidor debe ser la de la operación (America/Bogota). Si el runtime está en UTC, el cambio de día ocurre a las 19:00 de Colombia y el rango se corre; es un requisito de despliegue, no del cliente.
- Fechas futuras: `La fecha no puede ser futura.`
- Fechas anteriores a ayer: `Solo puedes reportar el día de hoy o el de ayer.`

### Códigos

| Estado | Código canónico | Cuándo se usa |
| --- | --- | --- |
| `base` | `BA` | La celda está vacía, tiene `FE` o un código que no traduce a `base`. |
| `pozo` | `ED` | La celda está vacía, tiene `FE` o un código que no traduce a `pozo`. |
| `descanso` | `DE` | La celda está vacía, tiene `FE` o un código que no traduce a `descanso`. |
| `licencia` | `LI` | La celda está vacía, tiene `FE` o un código que no traduce a `licencia`. |

Regla de preservación:

- Si el código actual no está vacío y `statusFromSheetCode(code) === status`, se escribe el mismo código.
- En cualquier otro caso se escribe el código canónico del estado.
- La comparación se hace después de `trim()` y `toUpperCase()`.
- `FE` y la celda vacía nunca se preservan: se reemplazan por el canónico del estado elegido.

### Notas

La nota es el único campo de texto libre de la celda. Se usa así:

| Estado | Nota escrita |
| --- | --- |
| `base` | `observaciones` |
| `pozo` | `pozo actividad` + ` · observaciones` si hay observaciones |
| `descanso` | `observaciones` |
| `licencia` | `observaciones` |

Al escribir se normalizan los espacios: los saltos de línea internos de pozo, actividad y observaciones se convierten en espacios. La nota de la hoja queda en una sola línea.

### Lectura de la nota

1. Se recorta la nota. Si está vacía, los tres campos quedan vacíos.
2. Si el estado no es `pozo`, toda la nota va a **Observaciones**.
3. Si el estado es `pozo`, se busca el primer token que cumpla `WELL_PATTERN`.
4. Si no hay coincidencia, toda la nota va a **Observaciones**; **Pozo** y **Actividad realizada** quedan vacíos y el usuario debe completarlos.
5. Si hay coincidencia:
   - El token es el **Pozo**.
   - El resto se recorta y se normaliza.
   - Si el resto contiene ` · `, la parte anterior es **Actividad realizada** y la posterior es **Observaciones**.
   - Si no contiene ` · `, todo el resto es **Actividad realizada**.

### Parser y serializador

```ts
// lib/report.ts

export const SHEET_CODE_BY_STATUS: Record<DayStatus, string> = {
  base: "BA",
  pozo: "ED",
  descanso: "DE",
  licencia: "LI",
};

export const SHEET_NOTE_SEPARATOR = " · ";

/** Nombre + número: SFRA099, SFRA 099, POZO-12. */
export const WELL_PATTERN = /\b[A-Z]{2,}(?:[ -]?\d{2,})\b/i;

export interface SheetNoteFields {
  well: string;
  activity: string;
  notes: string;
}

export function parseSheetNote(
  note: string,
  status: DayStatus | "",
): SheetNoteFields {
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

export function serializeSheetNote(
  fields: SheetNoteFields,
  status: DayStatus,
): string {
  const clean = (value: string) => value.replace(/\s+/g, " ").trim();
  const notes = clean(fields.notes);

  if (status !== "pozo") return notes;

  const base = [clean(fields.well), clean(fields.activity)]
    .filter(Boolean)
    .join(" ");

  return notes ? (base ? `${base}${SHEET_NOTE_SEPARATOR}${notes}` : notes) : base;
}
```

### Ejemplos de escritura

| Estado | Pozo | Actividad | Observaciones | Celda | Nota |
| --- | --- | --- | --- | --- | --- |
| `pozo` | `SFRA100` | `TRZ` | `Cambio de sarta` | `ED` | `SFRA100 TRZ · Cambio de sarta` |
| `pozo` | `SFRA099` | `ILT` | — | `ED` | `SFRA099 ILT` |
| `base` | — | — | `En IT aprendiendo` | `BA` | `En IT aprendiendo` |
| `descanso` | — | — | — | `DE` | — |
| `licencia` | — | — | `Permiso` | `LI` | `Permiso` |

### Ejemplos de lectura

| Nota en la hoja | Estado | Pozo | Actividad | Observaciones |
| --- | --- | --- | --- | --- |
| `SFRA099 ILT` | `pozo` | `SFRA099` | `ILT` | — |
| `SFRA100 TRZ · Cambio de sarta` | `pozo` | `SFRA100` | `TRZ` | `Cambio de sarta` |
| `En IT aprendiendo` | `pozo` | — | — | `En IT aprendiendo` |
| `En IT aprendiendo` | `base` | — | — | `En IT aprendiendo` |
| `CURSO 2024` | `pozo` | `CURSO 2024` | — | — |

`CURSO 2024` es el falso positivo conocido del patrón elegido: cualquier token con letras + dígitos y espacio opcional se interpreta como pozo. Si no representa un pozo, el usuario corrige el campo. El separador ` · ` se interpreta en su primera aparición; si la actividad contiene ese texto, la parte posterior se toma como observaciones.

---

## Contrato de código

### `lib/report.ts`

Se añaden los códigos canónicos, el separador, el patrón de pozo, el parser, el serializador y las utilidades de rango de fechas. `validateReport` cambia su regla de fecha.

```ts
export function previousLocalDate(iso: string): string {
  const date = parseLocalDate(iso);
  date.setDate(date.getDate() - 1);
  return getTodayLocal(date);
}

export function getReportDateRange(today: string): { min: string; max: string } {
  return { min: previousLocalDate(today), max: today };
}

export function isAllowedReportDate(date: string, today: string): boolean {
  const { min, max } = getReportDateRange(today);
  return date === min || date === max;
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
```

Reglas:

- `previousLocalDate("2026-11-01")` devuelve `"2026-10-31"`.
- `previousLocalDate("2026-01-01")` devuelve `"2025-12-31"`.
- `getReportDateRange("2026-11-06")` devuelve `{ min: "2026-11-05", max: "2026-11-06" }`.
- `isAllowedReportDate` devuelve `true` solo para esas dos fechas.
- `parseSheetNote` y `serializeSheetNote` son funciones puras, sin acceso a red ni a Supabase.

### `lib/sheets/client.ts`

Se añade una escritura de celda que actualiza valor y nota en una sola petición. No se toca la lectura existente.

```ts
export interface CellUpdate {
  tab: string;
  row: number;
  column: number;
  value: string;
  note: string;
}

export async function updateCell(update: CellUpdate): Promise<void> {
  const metadata = await getSpreadsheetMetadata();
  const sheet = metadata.sheets?.find(
    (candidate) => candidate.properties.title === update.tab,
  );

  if (!sheet) {
    throw new SheetsError(`No encontré la pestaña "${update.tab}".`);
  }

  await request(`${getSpreadsheetId()}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          updateCells: {
            range: {
              sheetId: sheet.properties.sheetId,
              startRowIndex: update.row - 1,
              endRowIndex: update.row,
              startColumnIndex: update.column - 1,
              endColumnIndex: update.column,
            },
            rows: [
              {
                values: [
                  {
                    userEnteredValue: { stringValue: update.value },
                    note: update.note,
                  },
                ],
              },
            ],
            fields: "userEnteredValue,note",
          },
        },
      ],
    }),
  });
}
```

Reglas:

- `fields: "userEnteredValue,note"` preserva formato, validación de datos y demás propiedades de la celda.
- `note: ""` limpia la nota existente.
- `value` se escribe como `stringValue` para que Google no interprete fórmulas.
- El `sheetId` se resuelve con `getSpreadsheetMetadata()` en cada guardado; es una llamada pequeña y el guardado es poco frecuente.

### `lib/sheets/layout.ts`

Se expone el índice numérico de la columna del día para poder construir el `GridRange` de `updateCells`.

```ts
/** Índice de columna (1 = A) del día de una fecha. */
export function dayColumnIndexForDate(iso: string): number {
  const { day } = parseIsoDate(iso);
  return FIRST_DAY_COLUMN + day - 1;
}

/** Columna del día (C = 1 … AG = 31). */
export function dayColumnForDate(iso: string): string {
  return columnLetter(dayColumnIndexForDate(iso));
}
```

`dayColumnForDate` conserva su firma actual; solo cambia su implementación.

### `lib/sheets/day.ts` (nuevo, `server-only`)

Contiene la lectura y la escritura de un día concreto.

```ts
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
import { getRowCells, getValues, updateCell } from "./client";
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
    const cells = await getRowCells(
      `${tab}!${columnLetter(column)}${row}`,
    );
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
  } catch {
    return { date, report: null, message: GENERIC_ERROR };
  }
}

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
  } catch {
    return { report: null, message: GENERIC_SAVE_ERROR };
  }
}
```

Reglas:

- `loadEmployeeDay` nunca lanza: credenciales, red, rango o error de Google se convierten en `report: null` + mensaje genérico.
- `saveEmployeeDay` nunca lanza: cualquier fallo se convierte en `report: null` + mensaje genérico.
- Si la celda no tiene valor ni nota, `loadEmployeeDay` devuelve `report: null` y `message: null`; el formulario queda vacío.
- Si la celda solo tiene nota, `status` es `""`, el código es `null` y la nota se carga según las reglas (para estado vacío, toda la nota va a observaciones).
- Si la celda tiene `FE`, `status` es `""`, `code` es `"FE"` y la nota se carga como observaciones. Al guardar, `FE` se reemplaza por el canónico del estado elegido.
- La escritura es atómica para valor y nota: una sola petición `batchUpdate`.
- La respuesta no contiene datos de otros empleados.

### `lib/sheets/month.ts`

La lectura del mes usa el mismo parser para que el histórico muestre pozo y actividad de las notas existentes.

```ts
const parsed = parseSheetNote(cell.note, status);

reports.push({
  id: `sheet:${date}`,
  date,
  status,
  code: cell.value.trim().toUpperCase(),
  well: parsed.well,
  activity: parsed.activity,
  notes: parsed.notes,
});
```

Ejemplo: la nota `SFRA099 ILT` de un día de pozo ahora se muestra en el histórico como **Pozo: SFRA099** y **Actividad realizada: ILT**, en lugar de aparecer completa bajo **Observaciones**.

### `app/actions/sheet.ts`

Se mantiene `loadMonthReportsAction` y se añaden las acciones del día. La identidad sale siempre de `getCurrentEmployee()`.

```ts
import {
  DAY_STATUSES,
  getTodayLocal,
  isAllowedReportDate,
  validateReport,
  type DayStatus,
  type ReportErrors,
  type ReportFormValues,
} from "@/lib/report";
import {
  loadEmployeeDay,
  saveEmployeeDay,
  type DayReportResult,
} from "@/lib/sheets/day";

const INVALID_DATE = "Fecha no válida.";
const OUT_OF_RANGE = "Solo puedes reportar el día de hoy o el de ayer.";
const NO_EMPLOYEE = "No encontramos tu ficha de empleado.";
const GENERIC_SAVE_ERROR = "No pudimos guardar el reporte. Intenta de nuevo.";

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function loadDayReportAction(
  date: string,
): Promise<DayReportResult> {
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
```

Reglas:

- La acción no recibe código, nombre ni correo del cliente.
- `loadDayReportAction` es de solo lectura; no valida el rango de hoy/ayer porque el formulario solo la llama con esas fechas y la lectura no modifica nada.
- `saveDayReportAction` valida el rango contra `getTodayLocal()` del servidor, el estado y las reglas del formulario antes de tocar la hoja. No recibe `today` del cliente: la fecha del navegador no es autoridad.
- Sin sesión responde con `NO_EMPLOYEE` y no escribe.
- Los errores de Google se convierten en un mensaje genérico; nunca se devuelve el mensaje crudo.
- La acción nunca lanza.

### `app/page.tsx`

El servidor calcula la fecha una sola vez y la pasa a la pantalla.

```tsx
export default async function Home() {
  await requireSession();

  const employee = await getCurrentEmployee();
  const serverToday = getTodayLocal();
  const todayDate = parseLocalDate(serverToday);
  const year = todayDate.getFullYear();
  const monthIndex = todayDate.getMonth();

  const initial = employee
    ? await loadEmployeeMonth(employee.employeeCode, year, monthIndex)
    : {
        month: monthKey(year, monthIndex),
        reports: [],
        message: "No encontramos tu ficha de empleado.",
      };

  return (
    <DailyReportPage
      employee={employee}
      today={serverToday}
      initialMonth={{ year, monthIndex }}
      initialReports={initial.reports}
      initialMessage={initial.message}
    />
  );
}
```

Reglas:

- `serverToday` es la única fuente de "hoy" para la pantalla del reporte.
- `initialMonth` se deriva de `serverToday`, así que el formulario y el calendario arrancan alineados.
- El cliente ya no calcula la fecha con `useTodayLocal`.

### `components/report/DailyReportPage.tsx`

`DailyReportPage` recibe `today` desde `app/page.tsx`, que lo calcula con `getTodayLocal()` en el servidor. Se eliminan `useTodayLocal`, `useSyncExternalStore` y `WorkspaceSkeleton`: la pantalla renderiza `ReportWorkspace` directamente con `today={today}`. El cliente nunca calcula el rango con la fecha del navegador.

```ts
interface DailyReportPageProps {
  employee: CurrentEmployee | null;
  today: string;
  initialMonth: { year: number; monthIndex: number };
  initialReports: DailyReport[];
  initialMessage: string | null;
}
```

Cambios de estado y flujo:

```tsx
const [sheetReports, setSheetReports] = useState<DailyReport[]>(initialReports);
const reports = sheetReports;
const [isLoadingDay, setIsLoadingDay] = useState(true);
const [isSaving, setIsSaving] = useState(false);
const [dayMessage, setDayMessage] = useState<string | null>(null);
const [dayLoadFailed, setDayLoadFailed] = useState(false);
const [existingCode, setExistingCode] = useState<string | null>(null);
const [saveError, setSaveError] = useState<string | null>(null);
const dayRequestIdRef = useRef(0);
```

- `sessionReports` desaparece.
- `values` arranca con `{ ...EMPTY_VALUES, date: today }`; `today` es la fecha del servidor.
- Al montar, se llama `loadDay(today)` una vez con esa misma fecha.
- `loadDay(date)` incrementa `dayRequestIdRef`, marca `isLoadingDay`, llama `loadDayReportAction(date)`, descarta respuestas viejas y aplica el resultado:
  - Si hay `report`: llena `values` con estado, pozo, actividad y observaciones; guarda `report.code` en `existingCode`.
  - Si no hay `report`: deja `values` vacío con la fecha y limpia `existingCode`.
  - Guarda `message` en `dayMessage` y `message !== null` en `dayLoadFailed`.
- `handleChange("date", value)` llama `handleDateChange`:
  - Actualiza la fecha, limpia el error de fecha, oculta la confirmación y limpia `saveError`.
  - Si `isAllowedReportDate(value, today)`, llama `loadDay(value)`; `today` es la fecha del servidor.
  - Si no, limpia `existingCode`, `dayMessage` y `dayLoadFailed`; la validación mostrará el error.
- `handleChange` para los demás campos limpia `saveError` y oculta la confirmación.
- `handleStatusChange` limpia `saveError`, oculta la confirmación y, como antes, vacía pozo/actividad cuando el estado no es `pozo`.
- `handleClear` vacía los campos, conserva la fecha seleccionada, limpia errores, confirmación y `saveError`. No borra la hoja ni recarga el día; el aviso de **Editando reporte existente** se mantiene si la celda tenía código.

`handleSubmit` pasa a asíncrono:

```tsx
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
      setSaveError(
        result.message ?? "No pudimos guardar el reporte. Intenta de nuevo.",
      );
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
    setVisibleMonth(savedMonth);
    void requestMonth(savedMonth);

    return {};
  } catch {
    setSaveError("No pudimos guardar el reporte. Intenta de nuevo.");
    return {};
  } finally {
    setIsSaving(false);
  }
}
```

- `today` en `validateReport` es la fecha del servidor recibida como prop; `saveDayReportAction` no la recibe y vuelve a calcularla con `getTodayLocal()`.
- Después de guardar se recarga el mes de la fecha guardada con `requestMonth`. Así el calendario, el histórico y el aviso del mes reflejan la hoja. Si la recarga falla, el reporte ya está guardado y se muestra el aviso genérico de lectura.
- La confirmación **Reporte guardado** se muestra después de un guardado exitoso. Cualquier edición posterior la oculta.
- El calendario lateral y el botón **Hoy** no cambian la fecha del formulario; solo mueven la vista del histórico.

### `components/report/ReportForm.tsx`

Props nuevas:

```ts
interface ReportFormProps {
  values: ReportFormValues;
  errors: ReportErrors;
  today: string;
  yesterday: string;
  showSuccess: boolean;
  isSaving: boolean;
  isLoadingDay: boolean;
  dayMessage: string | null;
  dayLoadFailed: boolean;
  existingCode: string | null;
  saveError: string | null;
  onChange: (field: ReportField, value: string) => void;
  onStatusChange: (status: DayStatus) => void;
  onSubmit: () => Promise<ReportErrors>;
  onClear: () => void;
}
```

`today` y `yesterday` llegan desde `serverToday`; no se calculan en el navegador.

Cambios visuales:

- El input de fecha usa `min={yesterday}` y `max={today}`.
- Debajo del campo de fecha: `Solo puedes reportar hoy o ayer.` en `text-xs text-muted-foreground`.
- Si `existingCode` no es `null`: `Editando reporte existente · <código>` con el código en `font-mono`.
- Si `dayMessage` no es `null`, se muestra debajo de la fecha; si `dayLoadFailed`, en rojo.
- Mientras `isLoadingDay`, todos los campos del formulario están deshabilitados. Mientras `isSaving`, el botón de guardar y el de limpiar están deshabilitados.
- El botón de envío dice **Guardar reporte**; mientras `isSaving`, **Guardando…**.
- El botón de limpiar sigue diciendo **Limpiar**.
- La confirmación dice **Reporte guardado**.
- Si `saveError` no es `null`, se muestra en el pie con `role="alert"` y `text-destructive`.
- El formulario no se puede enviar si `isLoadingDay` o `dayLoadFailed` son `true`.

El `handleSubmit` del formulario pasa a asíncrono para esperar `onSubmit()` y enfocar el primer campo inválido que devuelva el servidor.

### `components/report/StatusSelector.tsx`

Se añade `disabled?: boolean`:

- Se pasa a cada `input type="radio"`.
- Cuando está deshabilitado, la tarjeta usa `cursor-not-allowed opacity-60`.
- No cambia el resto del componente.

### `scripts/sheets-check.mjs`

Se extiende el diagnóstico para escribir y leer notas sin pasar por la interfaz.

```bash
npm run sheets:check -- read AVD12 2026-11-06
# AVD12 — 2026-11-06 — NOVIEMBRE!Z7
#   código actual: "ED"
#   nota actual: "SFRA100 TRZ"

npm run sheets:check -- write AVD12 2026-11-06 ED \
  --note "SFRA100 TRZ · Cambio de sarta" --yes
# AVD12 — 2026-11-06 — NOVIEMBRE!Z7
#   código antes: "ED" → ahora: "ED"
#   nota antes: "SFRA100 TRZ" → ahora: "SFRA100 TRZ · Cambio de sarta"
```

- `write` acepta `--note "texto"`; si se omite, escribe nota vacía.
- `write` sigue exigiendo `--yes`.
- `read` imprime el código y la nota actuales.
- La escritura usa `batchUpdate`/`updateCells` igual que la app.
- Es solo diagnóstico: la app no lo usa.

---

## Interfaz

### Formulario

- Al entrar a `/`, el formulario carga el reporte de hoy si existe. Con la hoja actual: `2026-11-06` → pozo, pozo `SFRA100`, actividad `TRZ`.
- La fecha inicial es `serverToday`, calculada en el servidor; el cliente no usa la fecha del navegador.
- Al cambiar la fecha a ayer: `2026-11-05` → pozo, pozo `SFRA099`, actividad `ILT`.
- Un día sin datos deja el formulario vacío, con la fecha seleccionada.
- El campo de fecha solo permite hoy y ayer según la fecha del servidor; el calendario nativo usa `min`/`max` con `serverToday` y la validación es la defensa real.
- La etiqueta **Editando reporte existente · ED** aparece cuando la celda ya tiene un código.
- Si el día tiene una nota sin código, el formulario carga las observaciones y el estado queda vacío.
- Si la celda tiene `FE`, el formulario carga la nota como observaciones y el estado queda vacío; al guardar, `FE` se reemplaza por el canónico.
- Mientras carga el día, el formulario está deshabilitado. Si la carga falla, se muestra el aviso y se bloquea **Guardar reporte**.
- Después de guardar, se muestra **Reporte guardado**; cualquier edición posterior la oculta.

### Calendario e histórico

- El calendario lateral y el histórico no cambian de comportamiento.
- Seleccionar un día en el calendario lateral no cambia la fecha del formulario; solo actualiza el día visible del histórico.
- Después de guardar, el calendario y el histórico muestran el reporte actualizado porque se recarga el mes de la fecha guardada.
- El histórico de un día de pozo con nota `SFRA099 ILT` muestra **Pozo: SFRA099** y **Actividad realizada: ILT**.
- El histórico de un día con nota sin pozo muestra la nota completa en **Observaciones**.
- La fuente sigue siendo `Fuente: CUADRO DE PERSONAL`.

---

## Archivos nuevos y cambios

```txt
specs/07-guardado-reporte-google-sheets.md   # este spec
lib/report.ts                                # rango de fechas, códigos, parser/serializer de nota, validación
lib/sheets/client.ts                         # updateCell (batchUpdate/updateCells)
lib/sheets/layout.ts                         # dayColumnIndexForDate
lib/sheets/day.ts                            # nuevo: loadEmployeeDay, saveEmployeeDay
lib/sheets/month.ts                          # parseSheetNote en la lectura del mes
app/actions/sheet.ts                         # loadDayReportAction, saveDayReportAction
app/page.tsx                                 # pasa serverToday y mantiene la precarga del mes
components/report/DailyReportPage.tsx        # carga/guardado del día, sin sessionReports
components/report/ReportForm.tsx             # min/max, estados de carga/guardado, textos
components/report/StatusSelector.tsx         # disabled
scripts/sheets-check.mjs                     # write --note, read con nota
AGENTS.md                                    # flujo de escritura y restricción de fecha
README.md                                    # comportamiento, comandos, alcance
specs/01-reporte-diario-campo.md             # nota de reemplazo
specs/06-carga-mes-google-sheets.md          # nota de reemplazo
```

No hay migraciones ni cambios en `supabase/`.

---

## Plan de implementación

1. **Dominio.** Añadir `SHEET_CODE_BY_STATUS`, `SHEET_NOTE_SEPARATOR`, `WELL_PATTERN`, `previousLocalDate`, `getReportDateRange`, `isAllowedReportDate`, `parseSheetNote`, `serializeSheetNote` y actualizar `validateReport` en `lib/report.ts`.
2. **Cliente de Sheets.** Añadir `updateCell` con `batchUpdate`/`updateCells` y `fields: "userEnteredValue,note"`.
3. **Layout.** Añadir `dayColumnIndexForDate` y reutilizarlo en `dayColumnForDate`.
4. **Servicio del día.** Crear `lib/sheets/day.ts` con `loadEmployeeDay` y `saveEmployeeDay`; nunca lanzan.
5. **Lectura del mes.** Usar `parseSheetNote` en `lib/sheets/month.ts` para que el histórico muestre pozo y actividad.
6. **Acciones.** Añadir `loadDayReportAction` y `saveDayReportAction` en `app/actions/sheet.ts` con validación de sesión, fecha, estado y reglas del formulario.
7. **Fecha del servidor.** En `app/page.tsx`, calcular `serverToday` con `getTodayLocal()` y pasarlo a `DailyReportPage`; eliminar `useTodayLocal` y el skeleton del cliente.
8. **Estado del cliente.** En `DailyReportPage`, eliminar `sessionReports`, añadir la carga del día, el guardado asíncrono, los estados de carga/error y la recarga del mes después de guardar.
9. **Formulario.** Añadir `min`/`max`, textos, estados deshabilitados, confirmación **Reporte guardado**, error de guardado y etiqueta de reporte existente en `ReportForm`; añadir `disabled` a `StatusSelector`.
10. **Diagnóstico.** Extender `scripts/sheets-check.mjs` con `write --note` y la nota en `read`.
11. **Documentación.** Actualizar `AGENTS.md`, `README.md` y las notas de reemplazo de los SPEC 01 y 06.
12. **Verificación.** `npx tsc --noEmit`, `npm run lint`, `npm run build`; flujos de Playwright; capturas en `.playwright-mcp/`; restaurar los valores originales de la hoja.

---

## Criterios de aceptación

- [ ] El input de fecha tiene `min=ayer` y `max=hoy`, derivados de `serverToday` (fecha del servidor).
- [ ] `validateReport` rechaza fechas anteriores a ayer con `Solo puedes reportar el día de hoy o el de ayer.`
- [ ] `saveDayReportAction` rechaza fechas fuera de hoy/ayer según `getTodayLocal()` del servidor y no recibe `today` del cliente.
- [ ] `app/page.tsx` pasa `serverToday` y el cliente no calcula el rango con la fecha del navegador.
- [ ] Al entrar a `/`, el formulario carga el estado, pozo, actividad y observaciones de hoy si la celda tiene datos.
- [ ] Al cambiar a ayer, carga los datos de ayer.
- [ ] Un día sin datos deja el formulario vacío con la fecha seleccionada.
- [ ] Guardar un día de base escribe `BA` (o conserva `BA`) y las observaciones en la nota.
- [ ] Guardar un día de pozo escribe el código, el pozo, la actividad y las observaciones; al recargar, los tres campos se recuperan.
- [ ] Guardar un pozo sin patrón de nombre + número deja la nota en observaciones y el campo pozo pendiente al recargar.
- [ ] Un código existente que traduce al mismo estado se conserva; si cambia el estado, se escribe el canónico.
- [ ] Un día con `FE` se carga sin estado y, al guardar, `FE` se reemplaza por el canónico.
- [ ] El histórico muestra pozo y actividad de notas existentes como `SFRA099 ILT`.
- [ ] El calendario y el histórico reflejan el reporte guardado.
- [ ] Aparece **Reporte guardado**; editar cualquier campo la oculta.
- [ ] El botón dice **Guardar reporte** y **Guardando…** mientras guarda.
- [ ] El formulario está deshabilitado mientras carga el día.
- [ ] Si la carga del día falla, se muestra el aviso y **Guardar reporte** queda bloqueado.
- [ ] El calendario lateral sigue navegando meses y no cambia la fecha del formulario.
- [ ] La acción no acepta identidad del cliente.
- [ ] Sin sesión no se escribe nada.
- [ ] Un error de Google devuelve un mensaje genérico, sin 500.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.
- [ ] `/` sigue siendo dinámica (`ƒ`).
- [ ] Sin errores ni advertencias de hidratación en la consola.
- [ ] Capturas de 1440×900 y 390×844 en `.playwright-mcp/`.
- [ ] La hoja queda con los mismos valores que antes de la verificación.
- [ ] No se añaden migraciones ni cambios de esquema.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El patrón de pozo confunde notas como `CURSO 2024` | Es heurístico y el usuario puede corregir el campo; se documenta el falso positivo. |
| La actividad contiene ` · ` | Se corta en la primera aparición; la parte posterior pasa a observaciones. |
| Dos sesiones guardan el mismo día | Gana la última escritura; no hay bloqueo. Se documenta. |
| Zona horaria del servidor | El rango se calcula con `getTodayLocal()`; el despliegue debe usar la zona de la operación (America/Bogota). Si el runtime está en UTC, el cambio de día ocurre a las 19:00 de Colombia. |
| El usuario está en otra zona horaria | La fecha del servidor manda; puede ver un día distinto al de su reloj. Es intencional. |
| La página queda abierta pasada la medianoche | El cliente conserva el `serverToday` del render; si el día cambia, el servidor rechaza la fecha vieja y el usuario recarga. |
| La carga del día falla y el usuario sobrescribe | Se bloquea **Guardar reporte** hasta que la carga sea correcta. |
| El código existente `L` o `B` se lee como pozo según SPEC 06 | Se conserva la traducción actual; el canónico de licencia/base es `LI`/`BA`. Cambiar la traducción queda fuera de alcance. |
| Sin permiso Editor | La escritura falla con mensaje genérico; el prerrequisito queda documentado. |
| La recarga del mes falla después de guardar | El reporte ya está guardado; se muestra el aviso genérico de lectura y el usuario puede cambiar de mes. |
| La nota de la hoja se normaliza a una sola línea | Los saltos de línea de actividad/observaciones se convierten en espacios; se documenta. |

---

## Prerrequisitos para implementar

1. `.env.local` con `GOOGLE_SHEETS_SPREADSHEET_ID` y la cuenta de servicio.
2. La cuenta de servicio debe tener permiso **Editor** sobre el libro; **Viewer** ya no basta.
3. Google Sheets API habilitada.
4. El servidor debe ejecutarse en la zona horaria de la operación (America/Bogota) o configurarse para que `getTodayLocal()` devuelva esa fecha.
5. El `employee_code` del empleado debe existir en la columna A de la pestaña del mes.
6. Una sesión de Playwright para `AVD12`.
7. Anotar los valores originales de las celdas que se usen en la verificación para restaurarlos.

---

## Lo que **no** incluye este spec

- Persistir los reportes en Supabase.
- Editar días distintos de hoy y ayer.
- Agregar columnas nuevas a la hoja para pozo, actividad u observaciones.
- Cambiar la traducción de códigos del SPEC 06 (`L` y `B` siguen leyéndose como pozo).
- Confirmación modal antes de sobrescribir, historial de cambios o auditoría.
- Bloqueo optimista o control de concurrencia entre dos sesiones.
- Roles, permisos por cargo o visibilidad de otros empleados.
- Notificaciones, polling o actualización en tiempo real.
- Pruebas automatizadas.

---

## Registro de verificación

**Estado:** pendiente de implementar.

Se completará después de `/spec-impl` con los comandos ejecutados, la tabla de criterios, las capturas y la limpieza de los valores temporales de la hoja.
