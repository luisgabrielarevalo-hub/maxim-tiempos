# SPEC 06 — Carga del mes desde Google Sheets

> **Estado:** Implementado
> **Depende de:** SPEC 01 (reporte diario), SPEC 05 (login real y protección de rutas)
> **Fecha:** 2026-11-06
> **Objetivo:** al iniciar sesión, y cada vez que el empleado cambia de mes en el calendario, cargar desde la pestaña del mes de **CUADRO DE PERSONAL 2026** los días del empleado autenticado (buscado por `employee_code` en la columna A), traducir cada código al estado de la app y usar la nota de la casilla como observaciones.

---

## Por qué existe este spec

Hoy `/` arranca con `reports = []`: el calendario y el histórico solo muestran lo que el usuario genera en la sesión con el formulario, y al recargar se pierde todo. La hoja **CUADRO DE PERSONAL 2026** ya es la fuente real de la operación y ya tiene el andamiaje técnico en el repo (`lib/sheets/client.ts` con cuenta de servicio, `lib/sheets/layout.ts` con el layout de las pestañas y `npm run sheets:check` como diagnóstico), pero nada de eso se usa en la interfaz.

Este spec conecta esa lectura con la pantalla del reporte: al entrar, el empleado ve su mes tal como está en la hoja, con los estados traducidos a `base | pozo | descanso | licencia` y las observaciones tomadas de las notas de cada celda. Al cambiar de mes, se carga la pestaña correspondiente.

No hay cambios de esquema ni migraciones: la identificación sale de `public.employees.employee_code`, que ya existe.

---

## Decisiones tomadas

- **Fuente de lectura:** Google Sheets API v4 con la cuenta de servicio que ya usa `lib/sheets/client.ts`. No se usa el login de Google del empleado ni el MCP de Drive en tiempo de ejecución.
- **Identificación:** `employee_code` del empleado autenticado contra la **columna A** de la pestaña del mes, comparando en mayúsculas y sin espacios. Si no hay coincidencia, el mes se muestra vacío con un aviso neutro. **No** hay respaldo por nombre ni por ObjectId.
- **Pestaña:** `MONTH_TABS[monthIndex]` (ENERO…DICIEMBRE). El año de la fecha visible **no** se usa para elegir la pestaña: el libro es anual y las pestañas no llevan año.
- **Días:** `C` = día 1 … `AG` = día 31. Se corta en el último día real del mes (`daysInMonth`), así que en meses de 30 días la columna `AG` se ignora.
- **Traducción:** `DE` → descanso, `BA` → base, `LI` → licencia, `FE` → omitido, casilla vacía → omitida, cualquier otro valor → pozo. Ver tabla completa abajo.
- **Observaciones:** la nota de la celda (`CellData.note`), recortada. Sin nota → cadena vacía.
- **Pozo y actividad:** la hoja no los distingue. Los días que vienen de la hoja llevan `well` y `activity` vacíos y el histórico solo muestra esos bloques cuando tienen texto.
- **Código original:** se conserva en `DailyReport.code` y se muestra como etiqueta mono junto al estado (`En pozo · ED`), para poder contrastar con la hoja.
- **Carga del mes actual:** se hace en el servidor al renderizar `/`, después de `requireSession()`. Un login exitoso redirige a `/`, así que la carga ocurre automáticamente.
- **Cambio de mes:** Server Action `loadMonthReportsAction` invocada desde el componente cliente. Sin caché: cada cambio de mes vuelve a leer la hoja.
- **Sin caché:** no se usa `unstable_cache`, `use cache` ni almacenamiento intermedio. Cada cambio de mes hace dos peticiones pequeñas (columna A y fila del empleado).
- **Solo lectura:** la app no escribe en la hoja en este spec.
- **Reportes del formulario:** siguen siendo de sesión y en memoria. Se guardan aparte de los de la hoja para que un cambio de mes no los borre.
- **Errores de Google:** nunca se expone el mensaje crudo. La interfaz recibe un aviso genérico en español.

---

## Alcance

**Incluye:**

- Lectura de valores **y** notas de la fila del empleado en una sola llamada de grid data.
- Traducción de códigos y armado de `DailyReport[]` con fechas ISO locales.
- Server Action `loadMonthReportsAction`, protegida por la sesión y sin parámetros de identidad.
- Precarga del mes actual en `app/page.tsx`.
- Recarga al navegar meses: anterior, siguiente, "Hoy" y clic en un día de un mes vecino.
- Estado de carga visible, aviso neutro por mes vacío o error, y descarte de respuestas obsoletas.
- Ajustes de presentación en calendario e histórico: código original, observaciones, estados vacíos y fuente.
- Separación entre reportes de la hoja y reportes de la sesión.
- Comando de diagnóstico `npm run sheets:check -- month <código> <YYYY-MM>`.
- Actualización de `AGENTS.md`, `README.md` y nota de reemplazo en el SPEC 01.
- Verificación con `npx tsc --noEmit`, `npm run lint`, `npm run build`, Playwright y capturas en `.playwright-mcp/`.

**Fuera de alcance:**

- Escribir en la hoja al generar un reporte (queda para otro spec).
- Persistir los reportes del formulario en Supabase, localStorage o cualquier medio.
- Búsqueda por nombre, por ObjectId o por cualquier columna distinta de A.
- Crear, renombrar o reordenar pestañas, filas o columnas.
- Selector de año, selector de libro o detección automática del archivo por nombre.
- Caché, revalidación, polling o actualización en tiempo real.
- Traducir `ED`, `EN`, `OD`, `V`, `F`, `I`, `D`, `N`, `B`, `L`, `GN`, `GD` a estados propios: todos caen en pozo.
- Roles, permisos por cargo o visibilidad de otros empleados.
- Pruebas automatizadas (no hay suite configurada).

---

## Contrato de datos

### Layout de la pestaña del mes

| Elemento | Posición | Uso |
| --- | --- | --- |
| Identificador del empleado | columna `A`, filas 7…200 | Se compara con `employee_code` |
| Nombre completo | columna `B` | Solo referencia; no se usa para buscar |
| Día 1 | columna `C` | `columnLetter(FIRST_DAY_COLUMN + 0)` |
| Día `d` | columna `C + d − 1` | Hasta el último día real del mes |
| Valor de la casilla | celda del día | Código del estado |
| Nota de la casilla | `CellData.note` | Observaciones |

Las filas con nombre pero sin identificador son encabezados de sección (`INGENIEROS`, `OPERADOR`, `AUXILIARES`…) y se ignoran.

### Tabla de traducción

La comparación es exacta después de `trim()` y `toUpperCase()`.

| Valor en la casilla | Estado en la app | En el calendario |
| --- | --- | --- |
| `DE` | `descanso` | Punto de descanso |
| `BA` | `base` | Punto de base |
| `LI` | `licencia` | Punto de licencia |
| `FE` | — (omitido) | Sin marca |
| Vacío | — (omitido) | Sin marca |
| Cualquier otro (`ED`, `EN`, `OD`, `V`, `F`, `I`, `D`, `N`, `B`, `L`, `GN`, `GD`…) | `pozo` | Punto de pozo |

Ejemplos reales de `NOVIEMBRE` (fila 7, `AVD12`): `C7:E7 = DE` (días 1–3, descanso), `F7 = BA` (día 4, base), `G7:H7 = ED` (días 5–6, pozo), resto vacío.

### Fechas

- La fecha de cada día es local `YYYY-MM-DD`: `${YYYY}-${MM}-${DD}`.
- `daysInMonth(year, monthIndex)` decide cuántos días se leen.
- No se generan días fuera del mes visible.

### Notas

- La nota se recorta (`trim()`) y se guarda tal cual, incluidos los saltos de línea internos.
- Una nota vacía o ausente deja `notes: ""`.
- No se valida la longitud de la nota al leer: la hoja manda.

---

## Contrato de código

### `lib/report.ts`

Se añade el estado derivado de la hoja y dos utilidades puras. `DailyReport` gana un campo opcional.

```ts
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

/** Días del mes (28–31). `monthIndex` es cero-based. */
export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Clave estable del mes: `YYYY-MM`. */
export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}
```

Reglas:

- `statusFromSheetCode("")` y `statusFromSheetCode("FE")` devuelven `"skip"`.
- `statusFromSheetCode("de")`, `statusFromSheetCode(" DE ")` devuelven `"descanso"`.
- `statusFromSheetCode("ED")`, `"V"`, `"OD"` devuelven `"pozo"`.
- `daysInMonth(2026, 10)` devuelve `30`; `daysInMonth(2024, 1)` devuelve `29`.
- `monthKey(2026, 10)` devuelve `"2026-11"`.

### `lib/sheets/client.ts`

Se añade una lectura de grid data que devuelve valor y nota por celda, y se fuerza `no-store` en todas las peticiones.

```ts
export interface GridCell {
  value: string;
  note: string;
}

interface GridDataResponse {
  sheets?: {
    data?: {
      rowData?: {
        values?: { formattedValue?: string; note?: string }[];
      }[];
    }[];
  }[];
}

/**
 * Valores y notas de una fila en una sola llamada. El índice 0 corresponde a
 * la primera columna del rango.
 */
export async function getRowCells(range: string): Promise<GridCell[]> {
  const query = new URLSearchParams({
    ranges: range,
    includeGridData: "true",
    fields: "sheets.data.rowData.values(formattedValue,note)",
  });

  const data = await request<GridDataResponse>(
    `${getSpreadsheetId()}?${query.toString()}`,
  );

  const values = data.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values ?? [];

  return values.map((cell) => ({
    value: (cell.formattedValue ?? "").trim(),
    note: (cell.note ?? "").trim(),
  }));
}
```

Reglas:

- El rango que se pide empieza siempre en la columna `C` del empleado, así que el índice del arreglo equivale al día menos uno.
- Las celdas finales vacías pueden no venir en la respuesta; el consumidor trata el índice ausente como vacío.
- `request()` añade `cache: "no-store"` al `fetch` para que ninguna capa de Next sirva datos viejos.
- El módulo es de servidor: añadir `import "server-only"` al inicio de `lib/sheets/client.ts`.

### `lib/sheets/layout.ts`

Se añaden dos funciones; el resto del archivo no cambia.

```ts
/** Pestaña del mes: 0 = enero … 11 = diciembre. */
export function monthTabForMonth(monthIndex: number): string {
  const tab = MONTH_TABS[monthIndex];

  if (!tab) throw new Error(`Mes inválido: ${monthIndex}.`);

  return tab;
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
```

Reglas:

- La primera coincidencia gana; no se esperan códigos duplicados en la columna A.
- Las filas vacías del rango conservan su índice, así que `EMPLOYEE_FIRST_ROW + index` es la fila real.
- Si el código no aparece, devuelve `null`; no lanza.

### `lib/sheets/month.ts` (nuevo, `server-only`)

```ts
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
```

Reglas:

- `loadEmployeeMonth` **nunca lanza**: credenciales ausentes, red caída, rango inexistente o error de Google se convierten en `reports: []` + `message` genérico.
- El error real no se registra con datos del empleado ni se devuelve al cliente.
- Solo se lee la fila del empleado autenticado; la respuesta no contiene datos de otros empleados.
- El `id` es estable (`sheet:YYYY-MM-DD`) para que React no remonte el histórico en cada carga.

### `app/actions/sheet.ts` (nuevo)

```ts
"use server";

import { getCurrentEmployee } from "@/lib/supabase/session";
import {
  loadEmployeeMonth,
  type MonthReports,
} from "@/lib/sheets/month";
import { monthKey } from "@/lib/report";

const INVALID_MONTH = "Mes no válido.";
const NO_EMPLOYEE = "No encontramos tu ficha de empleado.";

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
```

Reglas:

- La acción no recibe código, nombre ni correo: la identidad sale siempre de la sesión.
- Un `monthIndex` o `year` inválido no toca la hoja.
- Sin sesión responde sin datos y sin lanzar; no redirige (el proxy solo redirige `GET`/`HEAD`).
- No escribe en la hoja ni en Supabase.

### `app/page.tsx`

```tsx
export default async function Home() {
  await requireSession();

  const employee = await getCurrentEmployee();
  const todayDate = parseLocalDate(getTodayLocal());
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
      initialMonth={{ year, monthIndex }}
      initialReports={initial.reports}
      initialMessage={initial.message}
    />
  );
}
```

Reglas:

- La carga ocurre después de `requireSession()`, así que un login exitoso siempre aterriza con el mes ya leído.
- `getTodayLocal()` se evalúa en el servidor: el mes precargado es el del servidor. El cliente corrige el desfase con "Hoy" (ver abajo).
- Si `getCurrentEmployee()` es `null`, la página carga igual con el aviso de ficha.

---

## Interfaz

### `components/report/DailyReportPage.tsx`

Props nuevas:

```tsx
interface DailyReportPageProps {
  employee: CurrentEmployee | null;
  initialMonth: { year: number; monthIndex: number };
  initialReports: DailyReport[];
  initialMessage: string | null;
}
```

`ReportWorkspace` recibe `today`, `initialMonth`, `initialReports` e `initialMessage`, y separa dos listas:

```tsx
const [sheetReports, setSheetReports] = useState<DailyReport[]>(initialReports);
const [sessionReports, setSessionReports] = useState<DailyReport[]>([]);
const reports = [...sheetReports, ...sessionReports];
```

Reglas de estado:

- `visibleMonth` arranca en `initialMonth`, no en el mes local, para que los puntos coincidan con los datos precargados.
- `selectedDate` arranca en `today` si cae dentro de `initialMonth`; si no, en el último día de ese mes.
- `loadedMonth` guarda `{ key, message }` del último mes cargado. El aviso solo se muestra cuando `loadedMonth.key === monthKey(visibleMonth)`.
- `isLoadingMonth` se activa al empezar una petición y se desactiva al terminar la última.
- `requestIdRef` (contador) descarta respuestas viejas: si llega una respuesta cuyo id no es el último, se ignora.
- Al empezar una carga se vacía `sheetReports` para no pintar los puntos del mes anterior bajo las fechas nuevas. `sessionReports` no se toca.

Funciones:

```tsx
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
```

- `handlePreviousMonth`, `handleNextMonth`, `handleToday` y `handleSelectDate` pasan por `showMonth`.
- `handleToday` selecciona `today` y llama `showMonth` con el mes local, que puede diferir del del servidor.
- `handleSubmit` añade el reporte a `sessionReports` (no a `sheetReports`) y llama `showMonth` con el mes de la fecha reportada. La firma sigue siendo síncrona y devuelve `ReportErrors`, así que `ReportForm` no cambia.
- Los reportes de sesión se pintan después de los de la hoja, así que un reporte manual del mismo día gana en el punto del calendario.

### `components/report/ReportCalendar.tsx`

Props nuevas: `isLoading: boolean` y `message: string | null`.

- Encabezado: mientras `isLoading`, el texto es `Cargando…`; si no, `N registros este mes · noviembre 2026`.
- `aria-busy={isLoading}` en el contenedor del calendario.
- Debajo del encabezado y encima de la tabla, si `message` no es `null`, se muestra en `text-xs text-muted-foreground`.
- El resto del calendario (matriz, puntos, selección, "Hoy") no cambia.
- Los botones de mes siguen habilitados durante la carga; el contador de peticiones evita resultados cruzados.

### `components/report/ReportHistory.tsx`

- Estado vacío: `No hay registro para este día.`
- Cada entrada muestra el estado y, si `report.code` existe, una etiqueta mono pequeña al lado: `En pozo · ED`.
- Los bloques "Pozo" y "Actividad realizada" solo se pintan cuando `report.well` / `report.activity` tienen texto. Los días de la hoja no los traen.
- "Observaciones" sigue mostrando `report.notes` o `Sin observaciones`.
- Pie: `Fuente: CUADRO DE PERSONAL` (reemplaza "Histórico de esta sesión", que ya no describe el contenido).

### `scripts/sheets-check.mjs`

Nuevo comando de diagnóstico:

```bash
npm run sheets:check -- month AVD12 2026-11
npm run sheets:check -- month 65ca86c0d538a7ea602786a2 2026-11
```

Salida esperada:

```
CUADRO DE PERSONAL 2026 · NOVIEMBRE · AVD12 (fila 7)
  2026-11-01  descanso  DE
  2026-11-02  descanso  DE
  2026-11-03  descanso  DE
  2026-11-04  base      BA
  2026-11-05  pozo      ED
  2026-11-06  pozo      ED
```

- Acepta cualquier identificador de la columna A (código de 5 caracteres u ObjectId) para poder probar filas con notas sin tocar Supabase.
- Imprime la nota al final de la línea cuando existe.
- Es solo diagnóstico: la app no lo usa.

---

## Archivos nuevos y cambios

```
lib/sheets/month.ts                       # nuevo: loadEmployeeMonth + MonthReports
app/actions/sheet.ts                      # nuevo: loadMonthReportsAction
specs/06-carga-mes-google-sheets.md       # este spec
lib/report.ts                             # DailyReport.code, statusFromSheetCode, daysInMonth, monthKey
lib/sheets/client.ts                      # getRowCells, cache no-store, server-only
lib/sheets/layout.ts                      # monthTabForMonth, findEmployeeRow
app/page.tsx                              # precarga del mes actual
components/report/DailyReportPage.tsx     # estado de mes, carga vía acción, separación hoja/sesión
components/report/ReportCalendar.tsx      # isLoading + message
components/report/ReportHistory.tsx       # código, observaciones, estados vacíos, fuente
scripts/sheets-check.mjs                  # comando month
AGENTS.md                                 # flujo de carga desde Sheets
README.md                                 # comportamiento, comando month, alcance
specs/01-reporte-diario-campo.md          # nota de reemplazo del histórico en memoria
```

No hay migraciones ni cambios en `supabase/`.

---

## Plan de implementación

1. **Dominio.** Añadir `code` a `DailyReport`, `statusFromSheetCode`, `daysInMonth` y `monthKey` en `lib/report.ts`.
2. **Cliente de Sheets.** Añadir `getRowCells` y `cache: "no-store"`; marcar el módulo como `server-only`.
3. **Layout.** Añadir `monthTabForMonth` y `findEmployeeRow` en `lib/sheets/layout.ts`.
4. **Lectura del mes.** Crear `lib/sheets/month.ts` con `loadEmployeeMonth` (nunca lanza).
5. **Acción.** Crear `app/actions/sheet.ts` con validación de mes y sesión.
6. **Precarga.** Conectar `app/page.tsx` y ampliar las props de `DailyReportPage`.
7. **Cambio de mes.** Implementar `requestMonth` / `showMonth`, contador de peticiones y separación `sheetReports` / `sessionReports`.
8. **Presentación.** Ajustar `ReportCalendar` (carga y aviso) y `ReportHistory` (código, observaciones, fuente).
9. **Diagnóstico.** Añadir el comando `month` a `scripts/sheets-check.mjs`.
10. **Documentación.** Actualizar `AGENTS.md`, `README.md` y la nota del SPEC 01.
11. **Verificación.** `npx tsc --noEmit`, `npm run lint`, `npm run build`; flujos de Playwright; capturas; limpieza de cualquier cambio temporal en la hoja o en Supabase.

---

## Criterios de aceptación

- [x] Con sesión de `AVD12` y credenciales válidas, al entrar a `/` el calendario de `NOVIEMBRE` muestra descanso los días 1, 2 y 3, base el día 4 y pozo los días 5 y 6.
- [x] Los días 7 en adelante no muestran punto porque sus casillas están vacías.
- [x] Al seleccionar el día 5, el histórico muestra `En pozo` y la etiqueta `ED`. (La hoja tiene ahora una nota en esa casilla, así que muestra la nota en vez de `Sin observaciones`; ver registro.)
- [x] Al seleccionar el día 1, el histórico muestra `En descanso` y la etiqueta `DE`.
- [x] Al seleccionar un día vacío, el histórico muestra `No hay registro para este día.`
- [ ] Un día con `FE` no aparece ni en el calendario ni en el histórico. (Verificado en el comando `month` y en `statusFromSheetCode`; la fila de `AVD12` no tiene `FE` en ninguna pestaña, así que no se pudo cerrar en la interfaz.)
- [x] Las notas de las casillas se muestran como observaciones (verificado con una fila con notas y, si hace falta, con una nota temporal en la fila de `AVD12`).
- [ ] Al pasar a `OCTUBRE`, el calendario queda vacío y aparece `No encontramos tu código en la hoja de octubre.` (Queda vacío, pero el aviso correcto es `No hay días registrados para ti en octubre.` porque `AVD12` sí existe en `OCTUBRE!A7`; el camino "no encontrado" se verificó con `DICIEMBRE`.)
- [x] Al volver a `NOVIEMBRE`, los datos se cargan de nuevo.
- [x] "Hoy" vuelve al mes actual y lo carga si no estaba cargado.
- [x] Un clic en un día del mes vecino cambia el mes visible y dispara la carga de ese mes.
- [x] Con dos cambios de mes seguidos y rápidos, solo se aplica la respuesta del último mes.
- [x] Mientras carga, el calendario muestra `Cargando…` y no pinta puntos del mes anterior.
- [x] Sin `secrets/service-account.json` (o con la hoja sin compartir), `/` carga sin error 500 y muestra `No pudimos leer la hoja de cálculo. Intenta de nuevo.`
- [x] `loadMonthReportsAction` invocada sin sesión no devuelve datos y no lanza.
- [x] La acción no acepta código, nombre ni correo del cliente.
- [x] Un reporte generado con el formulario sigue apareciendo en el histórico y no se pierde al cambiar de mes.
- [x] `npm run sheets:check -- month <id con FE> 2026-01` omite los días `FE`.
- [x] `npm run sheets:check -- month <id con notas> 2026-01` imprime las notas de las casillas.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.
- [x] `/` se sigue compilando como dinámica (`ƒ`).
- [x] La consola del navegador no muestra errores de React ni advertencias de hidratación.
- [x] Hay capturas de 1440×900 y 390×844 en `.playwright-mcp/`.
- [x] No se añaden migraciones ni cambios de esquema.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Credenciales ausentes o cuenta de servicio sin acceso al libro | `loadEmployeeMonth` captura todo y devuelve un aviso neutro; la página nunca falla. Prerrequisito documentado. |
| Latencia de Google en cada cambio de mes | Dos peticiones pequeñas; indicador `Cargando…`; sin caché para no mostrar datos viejos. |
| Desfase de zona horaria entre servidor y cliente en el cambio de mes | El mes inicial es el del servidor; "Hoy" usa el mes local y recarga si hace falta. |
| El código no está en la columna A (hoy solo `NOVIEMBRE` lo tiene) | Mes vacío con aviso; no hay respaldo por nombre (decisión explícita). |
| Notas desplazadas por celdas vacías al inicio de la fila | El rango empieza en `C` y se mapea por índice; se verifica con una fila que tiene notas después de celdas vacías (`ENERO` `R8`/`Y8`). |
| Cambios rápidos de mes | Contador de peticiones: solo se aplica la última respuesta. |
| El empleado edita la hoja mientras navega | Cada cambio relee la hoja; no hay caché. |
| Fuga de datos de otros empleados | Solo se lee la fila del código propio y la respuesta solo contiene esos días. |
| Fuga de errores internos de Google | El cliente recibe un mensaje genérico; el error real no se expone. |
| Server Action invocada sin sesión | `getCurrentEmployee()` devuelve `null` y la acción responde sin datos. |
| Reportes manuales borrados al cambiar de mes | Se guardan en `sessionReports`, separados de `sheetReports`. |
| Meses de 30 días con columna `AG` | Se corta en `daysInMonth`; `AG` se ignora. |
| Fila con códigos duplicados en la columna A | Gana la primera coincidencia; se documenta y se vigila con el comando `month`. |

---

## Prerrequisitos para implementar

1. `.env.local` con `GOOGLE_SHEETS_SPREADSHEET_ID=13Zlnz-LzAe9xAnncw5LoKiV9ynmnuHLdgF1JtcdDcFo` (ya está).
2. **Crear la cuenta de servicio y guardar la clave en `secrets/service-account.json`** (ya existe y el libro está compartido con esa cuenta).
3. Habilitar **Google Sheets API** en el proyecto de Google Cloud.
4. Compartir **CUADRO DE PERSONAL 2026** con el email de la cuenta de servicio (Viewer basta para leer; Editor mantiene operativo `npm run sheets:check -- write`).
5. Que el `employee_code` del empleado exista en la columna A de la pestaña del mes. Hoy solo `AVD12` en `NOVIEMBRE`.
6. Una cuenta con sesión para Playwright (`AVD12` ya existe).

---

## Lo que **no** incluye este spec

- Escribir en la hoja al generar un reporte.
- Persistencia de los reportes del formulario.
- Búsqueda por nombre, ObjectId o columnas distintas de A.
- Selector de año, de libro o detección automática del archivo.
- Caché, revalidación o tiempo real.
- Traducción de los códigos operativos a estados propios.
- Roles, permisos por cargo o visibilidad de otros empleados.
- Pruebas automatizadas.

---

## Registro de verificación

**Estado:** implementado y verificado end-to-end con la hoja real. Quedan dos criterios que no se pueden cerrar sin editar la hoja (día `FE` en la interfaz y el aviso de `OCTUBRE`), detallados abajo.

**Entorno:** Next.js 16.3.4, build de producción (`npx next start -p 3106` y `-p 3108`), navegador Playwright. La sesión de `AVD12` se obtuvo con un magic link del Admin API de Supabase (no cambia contraseñas ni crea usuarios); `secrets/service-account.json` ya existe y el libro está compartido con la cuenta de servicio.

### Comandos ejecutados

```bash
npx tsc --noEmit                  # OK
npm run lint                      # OK
npm run build                     # OK; rutas: ƒ / · ○ /_not-found · ƒ /login · ƒ /register
npx next start -p 3106            # servidor con credenciales
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=<ruta inexistente> npx next start -p 3108   # servidor sin credenciales

npm run sheets:check -- month AVD12 2026-11
# CUADRO DE PERSONAL 2026 · NOVIEMBRE · AVD12 (fila 7)
#   2026-11-01  descanso  DE
#   2026-11-02  descanso  DE
#   2026-11-03  descanso  DE
#   2026-11-04  base      BA  · En IT aprendiendo
#   2026-11-05  pozo      ED  · SFRA099 ILT
#   2026-11-06  pozo      ED  · SFRA100 TRZ

npm run sheets:check -- month 65ca8629d538a7ea6027869f 2026-01
# ... 2026-01-16  base  BA  · SE MOVILIZA A ABRIR PERMISOS
# ... 2026-01-23  base  BA  · CURSO DE ALTURAS
# 2026-01-18 no aparece (T8 = FE)

npm run sheets:check -- read 65ca8629d538a7ea6027869f 2026-01-18
# código actual: "FE"
```

Comprobación externa de la Server Action sin cookies (id de acción del manifiesto):

```bash
curl -X POST http://localhost:3106/ -H "Next-Action: 60dc3203e4182db38276ac5d9bdcdf5dfd3eee7dd4" \
  -H "Content-Type: text/plain;charset=UTF-8" -H "Accept: text/x-component" --data "[2026,10]"
# 200 → {"month":"2026-11","reports":[],"message":"No encontramos tu ficha de empleado."}

curl ... --data "[1990,15]"
# 200 → {"month":"","reports":[],"message":"Mes no válido."}
```

### Tabla de criterios

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Días 1–6 de `NOVIEMBRE` con descanso/base/pozo | ✅ Verificado | Playwright: cabecera `6 registros este mes · noviembre 2026`; puntos solo en 1–6 con color de descanso (1–3), base (4) y pozo (5–6). |
| Días 7+ sin punto | ✅ Verificado | Playwright: el calendario solo tiene 6 puntos; el 7/11 muestra `No hay registro para este día.` |
| Día 5 → `En pozo · ED` | ✅ Verificado | Playwright: `En pozo · ED` y observaciones `SFRA099 ILT` (la hoja tiene nota; ver observaciones). |
| Día 1 → `En descanso · DE` | ✅ Verificado | Playwright: `En descanso · DE` y `Sin observaciones`. |
| Día vacío → `No hay registro para este día.` | ✅ Verificado | Playwright: histórico del 7/11 muestra ese texto exacto. |
| Día con `FE` omitido | ⚠️ Parcial | `ENERO T8 = "FE"` y `sheets:check -- month ... 2026-01` no imprime el 18/01; `statusFromSheetCode("FE") === "skip"`. No se pudo probar en la interfaz: `AVD12` es el único `employee_code` válido y su fila no tiene `FE` en ninguna de las 12 pestañas (barrido de `A7:AG7`); el resto de la columna A son ObjectIds que nunca coinciden con un `employee_code`. |
| Notas como observaciones | ✅ Verificado | Playwright: 4/11 → `En IT aprendiendo`, 5/11 → `SFRA099 ILT`, 6/11 → `SFRA100 TRZ`. CLI: `ENERO` imprime `SE MOVILIZA A ABRIR PERMISOS` y `CURSO DE ALTURAS`. |
| `OCTUBRE` vacío con aviso | ⚠️ Criterio desactualizado | Playwright: octubre carga con 0 puntos y muestra `No hay días registrados para ti en octubre.` porque `AVD12` sí existe en `OCTUBRE!A7`. El camino "no encontrado" se verificó con `DICIEMBRE`: `No encontramos tu código en la hoja de diciembre.` |
| Volver a `NOVIEMBRE` recarga | ✅ Verificado | Playwright: al volver, `Cargando…` y luego `6 registros este mes · noviembre 2026` con los 6 puntos. |
| "Hoy" vuelve al mes actual y carga | ✅ Verificado | Playwright: desde diciembre 2026 vuelve a noviembre 2026, selecciona el 6/11 y recarga. |
| Clic en día del mes vecino | ✅ Verificado | Playwright: clic en 1/12 desde noviembre → mes visible diciembre 2026, carga disparada y aviso de diciembre. |
| Dos cambios rápidos: gana la última respuesta | ✅ Verificado | Playwright: dos clics a "siguiente" con la primera petición en vuelo terminan en febrero 2027 con el aviso de febrero; ninguna respuesta vieja sobrescribe. |
| `Cargando…` y sin puntos del mes anterior | ✅ Verificado | Durante la carga: `aria-busy="true"`, cabecera `Cargando…`, 0 puntos y sin aviso. |
| Sin credenciales: sin 500 y aviso genérico | ✅ Verificado | Servidor `:3108` con `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` inexistente: `/` responde 200 y muestra `No pudimos leer la hoja de cálculo. Intenta de nuevo.` |
| Acción sin sesión no devuelve datos ni lanza | ✅ Verificado | POST directo sin cookies → 200 con `reports: []` y `No encontramos tu ficha de empleado.` |
| La acción no acepta identidad del cliente | ✅ Verificado | Firma `loadMonthReportsAction(year, monthIndex)`; la identidad sale de `getCurrentEmployee()`. |
| Reporte del formulario sobrevive al cambio de mes | ✅ Verificado | Playwright: reporte manual del 6/11 (descanso) sigue en histórico tras ir a octubre y volver; la cabecera pasa a `7 registros` y el punto del 6/11 toma el estado manual. Al recargar se pierde, como define el spec. |
| `sheets:check -- month` omite `FE` | ✅ Verificado | `month 65ca8629d538a7ea6027869f 2026-01` no imprime el 18/01 (`read` confirma `"FE"`). |
| `sheets:check -- month` imprime notas | ✅ Verificado | `month AVD12 2026-11` imprime las tres notas; `month ... 2026-01` imprime las dos de `ENERO`. |
| `tsc`, `lint` y `build` | ✅ Verificado | Los tres terminan sin errores. |
| `/` dinámica (`ƒ`) | ✅ Verificado | Salida de `next build`. |
| Consola sin errores ni warnings | ✅ Verificado | Playwright: 0 mensajes, 0 errores, 0 warnings. |
| Capturas 1440×900 y 390×844 | ✅ Verificado | `.playwright-mcp/spec-06-desktop-1440x900.png`, `.playwright-mcp/spec-06-mobile-390x844.png` (regeneradas con datos reales). |
| Sin migraciones ni cambios de esquema | ✅ Verificado | No hay archivos nuevos ni modificados en `supabase/`. |

### Limpieza de datos temporales

- No se creó ningún usuario de prueba: la sesión se obtuvo con `admin/generate_link` (magic link) para el usuario existente de `AVD12`, sin cambiar su contraseña. Estado final: `auth.users = 1`, `public.employees = 1` (solo `AVD12`).
- Servidores de verificación `:3106` y `:3108` y servidor auxiliar de cookies `:3107` detenidos; scripts y archivos temporales de sesión borrados.
- No se modificó la hoja ni se añadieron notas temporales.

### Observaciones

- **`OCTUBRE` contiene `AVD12` en `A7`**, aunque no tiene días marcados. Por eso el criterio que espera `No encontramos tu código en la hoja de octubre.` no se cumple con la hoja actual: el mensaje correcto es `No hay días registrados para ti en octubre.`. Conviene ajustar el criterio (o usar un mes sin el código, como `DICIEMBRE`).
- **La fila 7 de `NOVIEMBRE` ya tiene notas** (`En IT aprendiendo`, `SFRA099 ILT`, `SFRA100 TRZ`), así que el día 5 muestra la nota en lugar de `Sin observaciones`. Es el comportamiento que pide el spec; el criterio del día 5 quedó redactado antes de que existieran esas notas.
- **`FE` no se puede verificar en la interfaz** sin editar la hoja: solo `AVD12` es un `employee_code` válido y su fila no tiene `FE` en ninguna pestaña (barrido de `A7:AG7` en las 12). La omisión está cubierta por el comando `month` y por `statusFromSheetCode`.
- **Contador de respuestas:** el descarte de respuestas viejas se verificó con dos cambios de mes encadenados y se apoya en `requestIdRef` (revisión de código).
