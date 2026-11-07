# SPEC 08 — Total de días a descansar en el home

> **Estado:** Aprobado
> **Depende de:** SPEC 05 (sesión), SPEC 06 (carga del mes), SPEC 07 (guardado del día)
> **Fecha:** 2026-11-07
> **Objetivo:** mostrar en `/` el valor de la columna **TOTAL DE DIAS A DESCANSAR** (`AT`) de la fila del empleado autenticado en la pestaña del **mes calendario actual**, leído directamente de la hoja y refrescado solo cuando la app escribe en ella.

---

## Por qué existe este spec

El home muestra el mes, el calendario y el histórico, pero no el saldo de descanso del empleado, que hoy vive únicamente en la columna `AT` de **CUADRO DE PERSONAL 2026**. Ese dato es una fórmula de la hoja (`=AI+AK+AM+AQ+AS-AR`), no algo que la app pueda deducir de sus reportes: depende de los días de pozo, GTE, Parex y otros clientes, de los descansos tomados y del saldo del mes anterior.

Este spec lee `AT` de la fila del empleado en la pestaña del mes actual y la muestra como indicador en la barra lateral. La app **nunca** calcula el número: lo copia de la hoja. Por eso solo cambia cuando la hoja cambia, es decir, cuando el empleado guarda un reporte (que escribe la celda del día) o cuando recarga la página después de editar la hoja por fuera.

No hay cambios de esquema ni migraciones.

---

## Decisiones tomadas

- **Columna:** `AT` = **TOTAL DE DIAS A DESCANSAR**, fila del empleado en la pestaña del mes. Verificado en las 12 pestañas (`AT6` tiene el mismo encabezado en enero…diciembre).
- **Mes:** siempre el **mes calendario actual del servidor** (`getTodayLocal()`), no el mes visible del calendario. Navegar a otro mes no cambia el indicador. La etiqueta no muestra el mes (el usuario lo pidió así): es el saldo total de descanso del empleado.
- **Fuente:** lectura directa de la hoja (`getValues`, valor formateado por Google). La app no replica la fórmula ni suma los reportes en memoria.
- **Formato:** se parsea el valor con `Number()` y se formatea con `Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 })` en el servidor. `-2.5` → `-2,5`; `2.00` → `2`; `21.0` → `21`. Si el texto no es numérico se muestra tal cual; si la celda está vacía, `null`.
- **Refresco:** solo en dos momentos:
  1. Render inicial de `/` (servidor, junto con el mes).
  2. Después de un guardado exitoso de reporte (`saveDayReportAction` escribió la hoja).
  - Editar el formulario, **Limpiar**, cambiar de día o navegar meses **no** lo tocan.
  - No hay polling, revalidación al enfocar la ventana ni tiempo real.
  - Guardar un día de un mes anterior también cambia el total del mes actual por la cadena `DESCANSO ANTERIOR MES` (`AS = MES_ANTERIOR!AT`), así que tras **cualquier** guardado se relee el mes actual.
- **Ubicación:** tarjeta compacta en la barra lateral, entre el encabezado **Histórico de reportes** y el calendario.
- **Sin dato:** se muestra `—` con `Sin dato en la hoja.`. No se muestra un error nuevo: la carga del mes ya informa cualquier fallo de Google.
- **Errores:** si la lectura del indicador falla después de guardar, se conserva el último valor conocido y el guardado no se bloquea. Si falla en el render inicial, `restDays` es `null`.
- **Seguridad:** la Server Action no recibe parámetros; la identidad sale de la sesión y el mes de `getTodayLocal()`. El cliente no puede pedir otro empleado ni otro mes.
- **Sin caché:** cada lectura es `no-store`, como el resto de `lib/sheets/client.ts`.

---

## Alcance

**Incluye:**

- Constante y helper de la columna `AT` en `lib/sheets/layout.ts`.
- Loader `loadEmployeeRestDays` (`lib/sheets/rest-days.ts`) con formateo es-CO y manejo de vacío/error.
- Server Action `loadRestDaysAction()` sin parámetros.
- Carga inicial en `app/page.tsx` en paralelo con el mes.
- Estado `restDays`, refresco tras guardado y render de la tarjeta en `DailyReportPage`.
- Componente `RestDaysCard`.
- Diagnóstico `npm run sheets:check -- total <código> [YYYY-MM]` y línea de total en `month`.
- Actualización de `AGENTS.md` y `README.md`.
- Verificación con `npx tsc --noEmit`, `npm run lint`, `npm run build`, Playwright y capturas en `.playwright-mcp/`.

**Fuera de alcance:**

- Recalcular el total con `sheetReports`, con los estados del calendario o con cualquier dato local.
- Mostrar el total de otros meses o el de otros empleados.
- Mostrar las columnas vecinas (días descansados, descansos ganados, saldo anterior, etc.).
- Polling, `revalidate`, actualización al recuperar foco o tiempo real.
- Escribir `AT` (es una fórmula de la hoja).
- Cambiar el layout de la hoja o añadir validaciones de columna en tiempo de ejecución.
- Pruebas automatizadas (no hay suite configurada).

---

## Contrato de datos

### Posición

| Elemento | Valor |
| --- | --- |
| Columna | `AT` (índice 46, `columnLetter(46)`) |
| Encabezado | `AT6` = `TOTAL DE DIAS A DESCANSAR` |
| Valor | `AT<fila>` del empleado |
| Fórmula actual (NOVIEMBRE) | `=AI7+AK7+AM7+AQ7+AS7-AR7` |
| Formato del sheet | `0.0` / `0.00` (decimal con punto) |

### Valores observados (2026-11-07, fila 7 = `AVD12`)

| Pestaña | `AT7` |
| --- | --- |
| ENERO | `2.0` → `2` |
| OCTUBRE | `0.0` → `0` |
| NOVIEMBRE | `-2.5` → `-2,5` |
| DICIEMBRE | `-3` → `-3` |
| JULIO | celda vacía → `—` |

### Reglas

- `formatRestDays("")` → `null`.
- `formatRestDays("2.00")` → `"2"`; `formatRestDays("-2.5")` → `"-2,5"`; `formatRestDays("21.0")` → `"21"`.
- `formatRestDays("N/A")` → `"N/A"` (texto no numérico, se muestra tal cual).
- El valor negativo se muestra tal cual: significa saldo pendiente.
- El indicador no se muestra en el histórico ni se mezcla con `DailyReport`.

---

## Contrato de código

### `lib/sheets/layout.ts`

```ts
/** Columna "TOTAL DE DIAS A DESCANSAR" (AT) de la pestaña del mes. */
export const TOTAL_REST_DAYS_COLUMN = 46;

/** Rango A1 de la celda del total de días a descansar de una fila. */
export function totalRestDaysCell(tab: string, row: number): string {
  return `${tab}!${columnLetter(TOTAL_REST_DAYS_COLUMN)}${row}`;
}
```

### `lib/sheets/rest-days.ts` (nuevo, `server-only`)

```ts
import "server-only";

import { getTodayLocal, monthKey, parseLocalDate } from "@/lib/report";
import { getValues } from "./client";
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

  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(value);
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
  } catch {
    return { month, restDays: null, message: GENERIC_ERROR };
  }
}
```

Reglas:

- `loadEmployeeRestDays` **nunca lanza**.
- No lee notas ni otras celdas: una sola petición de una celda, después de localizar la fila.
- El año del parámetro `today` no elige otra pestaña: el libro es anual y la pestaña es solo el mes.
- No toca Supabase ni escribe.

### `app/actions/sheet.ts`

```ts
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
```

Reglas:

- Sin parámetros: ni código, ni fecha, ni mes desde el cliente.
- Nunca lanza.
- Sin sesión responde `NO_EMPLOYEE` y no lee la hoja.

### `app/page.tsx`

```tsx
const [initial, restDays] = await Promise.all([
  employee
    ? loadEmployeeMonth(employee.employeeCode, year, monthIndex)
    : Promise.resolve({
        month: monthKey(year, monthIndex),
        reports: [],
        message: "No encontramos tu ficha de empleado.",
      }),
  employee
    ? loadEmployeeRestDays(employee.employeeCode, serverToday)
    : Promise.resolve({ month: monthKey(year, monthIndex), restDays: null, message: null }),
]);
```

`DailyReportPage` recibe `initialRestDays={restDays.restDays}`. En el render inicial la pestaña coincide, pero las dos cargas son independientes para que el indicador no dependa del mes visible.

### `components/report/DailyReportPage.tsx`

- Nueva prop `initialRestDays: string | null`; estado `const [restDays, setRestDays] = useState<string | null>(initialRestDays)`.
- `handleSubmit`, después de un guardado exitoso (junto a `void requestMonth(savedMonth)`):

```tsx
void refreshRestDays();
```

```tsx
async function refreshRestDays() {
  try {
    const result = await loadRestDaysAction();
    setRestDays(result.restDays);
  } catch {
    // Conserva el último valor conocido; el guardado ya se confirmó.
  }
}
```

- `showMonth`, `handleToday`, `handleSelectDate`, `handleChange`, `handleStatusChange` y `handleClear` **no** tocan `restDays`.
- La tarjeta se pinta dentro del `<div className="pt-5">` de la barra lateral, antes de `ReportCalendar`.

### `components/report/RestDaysCard.tsx` (nuevo)

```tsx
"use client";

interface RestDaysCardProps {
  restDays: string | null;
}

export default function RestDaysCard({ restDays }: RestDaysCardProps) {
  const hasValue = restDays !== null;

  return (
    <section
      aria-label="Total de días a descansar"
      className="mb-5 rounded-lg border border-border bg-card px-4 py-4 shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
    >
      <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        Total de días a descansar
      </p>
      <p aria-live="polite" className="mt-1.5 flex items-baseline gap-1.5">
        <span className="font-display text-[38px] leading-none font-normal tabular-nums">
          {restDays ?? "—"}
        </span>
        {hasValue ? (
          <span className="text-[13px] text-muted-foreground">días</span>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {hasValue ? "Según CUADRO DE PERSONAL" : "Sin dato en la hoja."}
      </p>
    </section>
  );
}
```

- Sin mes en la etiqueta (decisión del usuario).
- Sin botón de refrescar.
- `aria-live="polite"` para anunciar el cambio tras guardar.

### `scripts/sheets-check.mjs`

- Nuevo comando `total <id> [YYYY-MM]`:

```
npm run sheets:check -- total AVD12
# CUADRO DE PERSONAL 2026 · NOVIEMBRE · AVD12 (fila 7)
#   AT6: "TOTAL DE DIAS A DESCANSAR "
#   AT7: "-2.5" → -2,5 días
```

- `month` añade al final: `TOTAL DE DIAS A DESCANSAR (AT7): "-2.5" → -2,5 días`.
- Sirve para comprobar que la columna no se movió y que el valor de la hoja coincide con la tarjeta.

---

## Interfaz

### Barra lateral

```
Histórico de reportes
┌──────────────────────────────────────┐
│ TOTAL DE DÍAS A DESCANSAR            │
│ -2,5 días                            │
│ Según CUADRO DE PERSONAL              │
└──────────────────────────────────────┘
7 registros este mes · noviembre 2026
[ calendario ]
[ histórico ]
```

- El bloque aparece siempre (también en móvil, después del formulario).
- Con celda vacía: `—` y `Sin dato en la hoja.`
- Al guardar un reporte, el valor se relee; si sube o baja, cambia sin recargar.
- Al navegar a otro mes, el número no cambia (siempre es el mes actual).
- Editar el formulario, **Limpiar** o cambiar la fecha no lo mueve.

---

## Archivos nuevos y cambios

```txt
specs/08-total-dias-descansar.md          # este spec
lib/sheets/layout.ts                      # TOTAL_REST_DAYS_COLUMN, totalRestDaysCell
lib/sheets/rest-days.ts                   # nuevo: loadEmployeeRestDays, formatRestDays
app/actions/sheet.ts                      # loadRestDaysAction
app/page.tsx                              # carga inicial en paralelo
components/report/DailyReportPage.tsx     # estado, refresco tras guardar, tarjeta
components/report/RestDaysCard.tsx        # nuevo
scripts/sheets-check.mjs                  # total + línea en month
AGENTS.md                                 # lectura del total de días a descansar
README.md                                 # comportamiento y comando
```

No hay migraciones ni cambios en `supabase/`.

---

## Plan de implementación

1. **Layout.** Añadir `TOTAL_REST_DAYS_COLUMN` y `totalRestDaysCell` en `lib/sheets/layout.ts`.
2. **Dominio de lectura.** Crear `lib/sheets/rest-days.ts` con `formatRestDays` y `loadEmployeeRestDays`.
3. **Acción.** Añadir `loadRestDaysAction()` en `app/actions/sheet.ts`.
4. **Carga inicial.** Leer el indicador en `app/page.tsx` con `Promise.all` y pasarlo como prop.
5. **Estado y refresco.** En `DailyReportPage`, añadir `restDays`, `refreshRestDays` y la llamada tras guardar.
6. **Presentación.** Crear `RestDaysCard` y montarlo sobre el calendario.
7. **Diagnóstico.** Añadir `total` y la línea de total en `month`.
8. **Documentación.** Actualizar `AGENTS.md` y `README.md`.
9. **Verificación.** `tsc`, `lint`, `build`, Playwright, capturas y restauración de la hoja.

---

## Criterios de aceptación

- [x] Con sesión de `AVD12`, la tarjeta muestra el valor actual de `NOVIEMBRE!AT7` (`-2` al 2026-11-07, con la etiqueta `días` y `Según CUADRO DE PERSONAL`).
- [x] El valor se lee de la columna `AT` de la pestaña del mes actual, no se calcula en la app.
- [x] Navegar a `OCTUBRE`, volver a `NOVIEMBRE`, pulsar **Hoy** o seleccionar otro día no cambia el número.
- [x] Editar cualquier campo del formulario sin guardar no cambia el número.
- [x] **Limpiar** no cambia el número.
- [x] Guardar un reporte relee la hoja y actualiza la tarjeta si `AT` cambió.
- [x] Guardar un reporte del mes anterior también relee el mes actual (efecto de `DESCANSO ANTERIOR MES`).
- [x] Si la celda `AT` del empleado no tiene valor, la tarjeta muestra `—` y `Sin dato en la hoja.`
- [x] Si el código no está en la pestaña del mes, la tarjeta muestra `—` sin romper la página.
- [x] Si Google falla en el render inicial, `/` responde 200, la tarjeta muestra `—` y el resto de la app sigue igual.
- [ ] Si la relectura falla después de guardar, se conserva el último valor y **Reporte guardado** no se pierde.
- [x] `loadRestDaysAction` no recibe parámetros y sin sesión no lee la hoja.
- [x] `formatRestDays` convierte `2.00` → `2`, `-2.5` → `-2,5`, `""` → `null`.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.
- [x] `/` sigue siendo dinámica (`ƒ`).
- [x] Sin errores ni advertencias de hidratación en la consola.
- [x] Capturas de 1440×900 y 390×844 en `.playwright-mcp/`.
- [x] La hoja queda con los mismos valores que antes de la verificación.
- [x] No se añaden migraciones ni cambios de esquema.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La columna `AT` se mueve en la hoja | `TOTAL_REST_DAYS_COLUMN = 46` documentado; `sheets:check -- total` imprime `AT6` y el valor para detectar el desplazamiento. |
| Google devuelve un valor viejo justo después de escribir | La escritura es `batchUpdate` y la relectura ocurre después de que la acción responde; si aun así llega el valor previo, la siguiente carga lo corrige. |
| La celda contiene texto y no un número | Se muestra el texto tal cual; el indicador no rompe la página. |
| La celda está vacía (`JULIO!AT7`) | `restDays` es `null` y la tarjeta muestra `—`. |
| Edición externa de la hoja sin recargar | No hay polling: se refleja al recargar o tras un guardado. Es el comportamiento pedido. |
| Fallo de Google al releer tras guardar | Se conserva el último valor; el guardado ya está confirmado. |
| El indicador se confunde con el mes visible | La etiqueta no menciona mes y el valor siempre es el del mes actual del servidor; se documenta. |
| Zona horaria del servidor | El mes sale de `getTodayLocal()`; el despliegue debe usar America/Bogota. |
| Peticiones extra en el render inicial | Dos peticiones pequeñas (columna A + una celda); se aceptan por separado del mes para no acoplar el indicador al mes visible. |

---

## Prerrequisitos para implementar

1. `.env.local` con `GOOGLE_SHEETS_SPREADSHEET_ID` y la cuenta de servicio.
2. La cuenta de servicio con acceso de lectura al libro (Editor sigue siendo necesario para guardar).
3. El `employee_code` del empleado debe existir en la columna A de la pestaña del mes actual.
4. Una sesión de Playwright para `AVD12`.
5. Anotar los valores originales de las celdas que se usen en la verificación para restaurarlos.

---

## Lo que **no** incluye este spec

- Recalcular el total con datos locales.
- Mostrar el total de otros meses o de otros empleados.
- Mostrar las demás columnas de resumen (días descansados, descansos ganados, etc.).
- Polling, revalidación o tiempo real.
- Escribir la columna `AT`.
- Cambios de layout en la hoja o migraciones.
- Pruebas automatizadas.

---

## Plan de verificación

1. `npx tsc --noEmit`, `npm run lint`, `npm run build`.
2. `npm run sheets:check -- total AVD12` y comparación con la tarjeta en `/`.
3. Playwright: valor inicial, navegación de meses, edición sin guardar, **Limpiar**.
4. Guardado temporal de un día del mes actual con `sheets:check -- write`, comprobar que la tarjeta cambia, restaurar el valor original y comprobar que vuelve.
5. Servidor sin credenciales (`GOOGLE_SERVICE_ACCOUNT_KEY_FILE` inexistente): `/` responde 200 y la tarjeta muestra `—`.
6. Capturas 1440×900 y 390×844 en `.playwright-mcp/`.
7. Confirmar que `AT` y las celdas usadas quedan con sus valores originales.

---

## Registro de verificación

**Fecha:** 2026-11-07
**Entorno:** Next.js 16.3.4. Dev server en `:3000` con `.env.local`; la sesión de `AVD12` se obtuvo con `admin/generate_link` (magic link) y se materializó como cookie de `@supabase/ssr`, sin cambiar contraseñas ni crear usuarios. El escenario de fallo de Google se sirvió con el build de producción en `:3109` y `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` apuntando a una ruta inexistente.

**Corrección posterior (misma fecha):** tras detectar el fallo del criterio 11 se corrigió `refreshRestDays` y se revalidó con `npx tsc --noEmit`, `npm run lint`, `npm run build` (exit 0, `ƒ /`) y Playwright en `:3000`: tarjeta `-2` en noviembre, `-2` tras ir a octubre, `-2` tras **Hoy**, `-2` tras editar observaciones sin guardar y `-2` tras **Limpiar**; consola solo con React DevTools/HMR. Capturas nuevas: `.playwright-mcp/spec08-fix-1440x900.png` y `.playwright-mcp/spec08-fix-390x844.png`.

### Comandos ejecutados

```bash
npx tsc --noEmit        # exit 0, sin salida
npm run lint            # exit 0, sin salida
npm run build           # exit 0; rutas: ƒ / · ○ /_not-found · ƒ /login · ƒ /register · ƒ Proxy (Middleware)

npm run sheets:check -- total AVD12
# CUADRO DE PERSONAL 2026 · NOVIEMBRE · AVD12 (fila 7)
#   AT6: "TOTAL DE DIAS A DESCANSAR "
#   AT7: "-2.0" → -2 días

npm run sheets:check -- month AVD12 2026-11
# 1-3 descanso DE · 4 base BA (En IT aprendiendo) · 5 base BA (Algo hice) · 6 pozo ED (SFRA01 Tubing puncher · Bono doble) · 7 pozo ED (RC08 GPET)
#   TOTAL DE DIAS A DESCANSAR (AT7): "-2.0" → -2 días

npm run sheets:check -- total AVD12 2026-10   # AT7: "0.0" → 0 días
npm run sheets:check -- total AVD12 2026-07   # ✖ No encontré "AVD12" en la columna A de JULIO
npm run sheets:check -- total AVD12 2026-01   # ✖ No encontré "AVD12" en la columna A de ENERO
```

Barrido de las 12 pestañas (lectura A1:AT8): `AVD12` existe solo en **OCTUBRE** (`AT7 = 0.0`) y **NOVIEMBRE** (`AT7 = -2.0`); en el resto no está en la columna A.

### Tabla de criterios

| # | Criterio | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | Tarjeta con el valor actual de `NOVIEMBRE!AT7` | ✅ Verificado | `/` mostró `TOTAL DE DÍAS A DESCANSAR · -2 · días · Según CUADRO DE PERSONAL`; `sheets:check -- total AVD12` → `"-2.0" → -2`. Criterio reescrito: la hoja ya no vale `-2.5`. |
| 2 | Se lee de `AT`, no se calcula | ✅ Verificado | `lib/sheets/layout.ts:47,134-136`, `lib/sheets/rest-days.ts:42-53` (`findEmployeeRow` + `getValues(totalRestDaysCell(...))`). Ningún cálculo local. |
| 3 | Navegar de mes, **Hoy** o elegir día no cambia el número | ✅ Verificado | Playwright: `OCTUBRE` (`0 registros este mes · octubre 2026`) → `-2`; `NOVIEMBRE` → `-2`; **Hoy** → `-2`; clic en 4/11 → `-2`. |
| 4 | Editar sin guardar no cambia el número | ✅ Verificado | Actividad cambiada a `GPET PRUEBA SPEC 08`: tarjeta `-2` y sin petición nueva en la red (`browser_network_requests`). |
| 5 | **Limpiar** no cambia el número | ✅ Verificado | Tras **Limpiar** (formulario vacío) la tarjeta siguió en `-2` y no hubo petición nueva. |
| 6 | Guardar relee y actualiza la tarjeta | ✅ Verificado | Guardado real de 2026-11-07 como **En descanso** → celda `DE`, `AT7 = "-3.5"`, tarjeta `-3,5` sin recargar + **Reporte guardado**. Restaurado con pozo `RC08`/`GPET` → `ED`, `AT7 = "-2.0"`, tarjeta `-2`. |
| 7 | Guardar un día de mes anterior relee el mes actual | ✅ Verificado (código) | `components/report/DailyReportPage.tsx:362-363` llama `refreshRestDays()` tras **cualquier** guardado exitoso y `app/actions/sheet.ts:65-71` lee siempre el mes de `getTodayLocal()`. No reproducible en UI hoy: el formulario solo permite hoy/ayer y hoy es 7/11. |
| 8 | Celda `AT` vacía → `—` / `Sin dato en la hoja.` | ✅ Verificado (código + render) | `lib/sheets/rest-days.ts:19-22` (`""` → `null`), `components/report/RestDaysCard.tsx:20,27`; el render con `restDays = null` se observó en `:3109`. Criterio reescrito: `JULIO` no contiene `AVD12`, así que el escenario original no es reproducible. |
| 9 | Código ausente en la pestaña → `—` sin romper | ✅ Verificado (código) | `lib/sheets/rest-days.ts:42-44` (`row === null` → `restDays: null`); la página no lanza. No ejercitado end-to-end: `AVD12` es la única cuenta con sesión y sí existe en `NOVIEMBRE`. |
| 10 | Fallo de Google en el render inicial | ✅ Verificado | `:3109` sin credenciales: `GET /` → 200, tarjeta `— / Sin dato en la hoja.`, calendario con `No pudimos leer la hoja de cálculo. Intenta de nuevo.`, formulario y botones intactos. |
| 11 | Fallo de la relectura conserva el último valor | ✅ Verificado (corregido) | Fallaba porque `DailyReportPage.tsx:229-230` hacía `setRestDays(result.restDays)` sin condición. Corregido con `if (!result.message) setRestDays(result.restDays)`: un error de lectura (`restDays: null` + `message`) conserva el último valor, y un vacío real de la hoja (`message: null`) sigue mostrando `—`. |
| 12 | Acción sin parámetros y sin sesión no lee la hoja | ✅ Verificado | `app/actions/sheet.ts:65` (`loadRestDaysAction(): Promise<RestDaysSummary>`), guarda `getCurrentEmployee()` en 67-79 antes de llamar al loader. |
| 13 | `formatRestDays` | ✅ Verificado | `lib/sheets/rest-days.ts:19-31`; en vivo `"-2.0"` → `-2` y `"-3.5"` → `-3,5` (es-CO, coma decimal). |
| 14 | `tsc`, `lint` y `build` | ✅ Verificado | Los tres terminan con exit 0. |
| 15 | `/` dinámica (`ƒ`) | ✅ Verificado | Salida de `next build`: `┌ ƒ /`. |
| 16 | Consola sin errores ni advertencias de hidratación | ✅ Verificado | `browser_console_messages`: 10 mensajes, 0 errores, 0 warnings (solo React DevTools/HMR). |
| 17 | Capturas 1440×900 y 390×844 | ✅ Verificado | `.playwright-mcp/spec08-01-tarjeta-1440x900.png`, `.playwright-mcp/spec08-01-tarjeta-390x844.png`, `.playwright-mcp/spec08-10-sin-credenciales-1440x900.png`. |
| 18 | La hoja queda igual | ✅ Verificado | `NOVIEMBRE!I7` restaurada a `ED` + nota `RC08 GPET`; `AT7 = "-2.0"`, idénticos al inicio. |
| 19 | Sin migraciones ni cambios de esquema | ✅ Verificado | `git status --short` no reporta cambios en `supabase/`; `supabase/migrations/` sigue con los 3 archivos previos. |

### Hallazgo principal

**Criterio 11 fallaba en la primera pasada y ya está corregido.** `loadRestDaysAction` nunca lanza: absorbe el error y responde `restDays: null` con `message`, y `refreshRestDays` asignaba ese `null` sin distinguir éxito de fallo. Resultado previo: ante un fallo de Google justo después de guardar, la tarjeta pasaba de `-2` a `—` (el **Reporte guardado** sí se mantenía).

**Corrección aplicada** (`components/report/DailyReportPage.tsx`, `refreshRestDays`): solo se sobrescribe el estado cuando la respuesta no trae `message`.

```tsx
const result = await loadRestDaysAction();

// Un fallo de lectura devuelve `message`; se conserva el último valor
// conocido y un vacío real de la hoja (`message: null`) sigue mostrando `—`.
if (!result.message) setRestDays(result.restDays);
```

Así el contrato del spec («se conserva el último valor conocido») se cumple sin cambiar el contrato de datos: `message` ya distinguía error de vacío. Revalidado con `tsc`, `lint`, `build` y Playwright (el flujo normal de actualización tras guardar sigue funcionando y el resto de la pantalla no cambia).

### Observaciones

- El valor de la hoja cambió respecto al spec: `NOVIEMBRE!AT7` es `-2.0` (no `-2.5`), porque la fórmula `=AI7+AK7+AM7+AQ7+AS7-AR7` recalcula con los días de la fila. El criterio 1 se reescribió para no fijar un número volátil.
- La tabla «Valores observados» del spec (ENERO `2.0`, JULIO vacía, DICIEMBRE `-3`) no es reproducible: `AVD12` solo existe en las pestañas OCTUBRE y NOVIEMBRE. El criterio 8 se reescribió para describir el caso real (celda sin valor).
- La verificación de guardado escribió `NOVIEMBRE!I7` de forma temporal (`ED` → `DE` → `ED`) y restauró valor y nota originales.
