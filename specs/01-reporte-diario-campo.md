# SPEC 01 — Reporte diario de campo

> **Estado:** Implementado
> **Depende de:** Ninguno
> **Fecha:** 2026-11-05
> **Objetivo:** Implementar en Next.js la pantalla `/` (home) a partir del prototipo `Referencias/reporte-diario-campo.html`, con formulario validado, histórico en memoria y calendario, usando íconos lineales de temática petrolera.
>
> **Nota (SPEC 06):** el histórico en memoria descrito aquí fue reemplazado por la carga del mes desde Google Sheets. Los reportes generados con el formulario siguen siendo de sesión y se guardan aparte. Ver `specs/06-carga-mes-google-sheets.md`.

---

## Por qué existe este spec

El proyecto solo tiene el starter de `create-next-app` y tres prototipos HTML en `Referencias/`.
Esta es la primera pantalla real del producto y fija las convenciones de rutas, estilos, tipografías y componentes que reutilizarán las pantallas de login y registro.
El prototipo define el comportamiento; este spec lo traduce a React sin agregar backend ni persistencia.

---

## Alcance

**Incluye:**

- Ruta `/` (home) con la pantalla completa del reporte diario.
- Formulario con fecha, estado del día, detalle de pozo y observaciones.
- Validaciones, mensajes de error, contadores y foco en el primer campo inválido.
- Tarjetas de estado con íconos lineales de temática petrolera.
- Histórico en memoria con calendario mensual, puntos por estado y detalle del día seleccionado.
- Botones "Generar reporte" y "Limpiar".
- Insignia "Reporte completo" después de un envío válido.
- Diseño responsive con una columna en móvil y dos columnas desde 960 px.
- Tipografías Bebas Neue, Barlow e IBM Plex Mono mediante `next/font/google`.
- Tokens de color oklch en `app/globals.css` bajo `@theme inline`.
- Verificación con `npx tsc --noEmit`, `npm run lint`, `npm run build` y capturas de Playwright en `.playwright-mcp/`.

**Fuera de alcance (para specs futuros):**

- Login y registro de empleados.
- Backend, API, base de datos o autenticación.
- Persistencia en localStorage, IndexedDB o archivos.
- Acciones "Copiar texto" e "Imprimir / PDF".
- Edición o eliminación de reportes ya generados.
- Modo oscuro, internacionalización o multiempresa.
- Pruebas automatizadas.
- Pantalla de dashboard o inicio alternativo.

---

## Modelo de datos

```ts
// lib/report.ts

export type DayStatus = "base" | "pozo" | "descanso" | "licencia";

export interface DailyReport {
  id: string; // crypto.randomUUID()
  date: string; // YYYY-MM-DD local
  status: DayStatus;
  well: string; // "pozo"; vacío si status !== "pozo"
  activity: string; // "actividad"; vacío si status !== "pozo"
  notes: string; // "observaciones"
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
```

Constantes:

```ts
export const DAY_STATUSES: readonly DayStatus[] = ["base", "pozo", "descanso", "licencia"];
export const REQUIRED_NOTES_STATUSES: readonly DayStatus[] = ["base"];
export const MAX_WELL_LENGTH = 60;
export const MAX_ACTIVITY_LENGTH = 500;
export const MAX_NOTES_LENGTH = 300;
```

Metadatos de estado:

```ts
export const STATUS_META: Record<DayStatus, { label: string; note: string }> = {
  base: { label: "En base", note: "Apoyo administrativo o logístico en instalaciones." },
  pozo: { label: "En pozo", note: "Operativo directo en el campo." },
  descanso: { label: "En descanso", note: "Día de descanso programado del turno." },
  licencia: { label: "En licencia", note: "Permiso, incapacidad o licencia autorizada." },
};
```

Convenciones:

- Las fechas son strings locales `YYYY-MM-DD`; nunca se usa `toISOString()` para construirlas.
- `well`, `activity` y `notes` se guardan recortados con `trim()` al enviar.
- Los reportes viven en un arreglo en memoria dentro del componente cliente; no se escriben en disco.
- El calendario siempre genera 42 celdas (6 filas × 7 columnas) y empieza en lunes.

---

## Plan de implementación

1. **Tipografías y tokens.** Actualizar `app/layout.tsx` con Bebas Neue, Barlow e IBM Plex Mono, `lang="es"` y metadatos base. Actualizar `app/globals.css` con los tokens oklch del prototipo, el mapeo en `@theme inline` y los estilos base de `body`. Prueba manual: la app sigue renderizando y las fuentes se aplican.
2. **Utilidades del dominio.** Crear `lib/report.ts` con tipos, constantes, metadatos de estado, `getTodayLocal`, `formatLongDate`, `parseLocalDate`, `getMonthMatrix`, `validateReport`, `filterReportsByDate` y `formatMonthLabel`. Prueba manual: el proyecto compila con `npx tsc --noEmit`.
3. **Íconos petroleros.** Crear `components/report/icons.tsx` con SVGs de 24×24, trazo de 2 px, sin relleno y `aria-hidden`. Prueba manual: los íconos se renderizan a 20 px sin perder legibilidad.
4. **Ruta y shell visual.** Reemplazar `app/page.tsx` con un componente servidor que declare los metadatos y renderice `components/report/DailyReportPage.tsx` como componente cliente. Implementar la cinta superior, el encabezado y la grilla de dos columnas. Prueba manual: `/` muestra el shell con placeholders.
5. **Formulario y selector de estado.** Implementar `ReportForm.tsx` y `StatusSelector.tsx` con estado controlado, secciones 01–03, contadores y bloque condicional de pozo. Prueba manual: al elegir "En pozo" aparecen pozo y actividad; al cambiar de estado se ocultan y se limpian.
6. **Validación y envío.** Conectar `validateReport`, pintar errores por campo, enfocar el primer campo inválido y agregar el reporte al estado. Al enviar, seleccionar la fecha del reporte y mostrar "Reporte completo". Prueba manual: un envío inválido no agrega nada; uno válido agrega exactamente un reporte.
7. **Calendario.** Implementar `ReportCalendar.tsx` con grilla de 42 celdas, encabezados de lunes a domingo, puntos por estado, anillo de "hoy", día seleccionado, navegación de mes y botón "Hoy". Prueba manual: los reportes aparecen como puntos y la navegación cambia el mes visible.
8. **Detalle del día.** Implementar `ReportHistory.tsx` con leyenda, conteo mensual, lista de reportes del día seleccionado, detalle de pozo/actividad y estado vacío. Prueba manual: el día seleccionado muestra sus reportes y los días sin reportes muestran el mensaje vacío.
9. **Sincronización de estado.** Asegurar que cambiar el estado, editar el formulario, limpiar o seleccionar otro día oculte la insignia "Reporte completo" y limpie los errores correspondientes. Prueba manual: la insignia solo aparece después de un envío válido.
10. **Responsive y pulido.** Ajustar breakpoints de 640 px y 960 px, hacer sticky el histórico en escritorio, revisar foco visible, contraste y alineación con el prototipo. Prueba manual: capturas en 1440×900 y 390×844.
11. **Verificación final.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`. Corregir errores y guardar capturas en `.playwright-mcp/`.

---

## Criterios de aceptación

- [x] `/` responde y muestra la pantalla en español sin errores en consola.
- [x] `/` es la pantalla del reporte diario y ya no muestra el contenido del starter de `create-next-app`.
- [x] La fecha inicia en el día local actual y su atributo `max` también es hoy.
- [x] Una fecha futura muestra "La fecha no puede ser futura." y no agrega el reporte.
- [x] Enviar sin estado muestra "Selecciona dónde estuvo ese día." y enfoca el primer radio.
- [x] Elegir "En pozo" revela los campos de pozo y actividad; elegir otro estado los oculta y los vacía.
- [x] El pozo es obligatorio, acepta máximo 60 caracteres y muestra error si se excede.
- [x] La actividad es obligatoria, acepta máximo 500 caracteres y muestra error si se excede.
- [x] Las observaciones aceptan máximo 300 caracteres y muestran error si se excede.
- [x] Los contadores muestran `n/500` y `n/300` y cambian a color destructivo al exceder el límite.
- [x] Las observaciones son obligatorias para `base` y opcionales para `pozo`, `descanso` y `licencia`.
- [x] La etiqueta de observaciones cambia entre "Obligatorio para este día" y "Opcional" según el estado.
- [x] Un envío válido agrega exactamente un reporte, selecciona su fecha en el calendario y muestra "Reporte completo".
- [x] El calendario siempre tiene 42 celdas, empieza en lunes, marca hoy y el día seleccionado, y muestra un punto del color del último estado del día.
- [x] Las flechas de mes y el botón "Hoy" actualizan el calendario sin modificar el formulario.
- [x] El detalle del día lista todos los reportes de la fecha seleccionada; si es pozo, muestra pozo y actividad.
- [x] Un día sin reportes muestra el estado vacío "No hay reportes generados para este día."
- [x] "Limpiar" restablece el formulario, pone la fecha en hoy, limpia errores y oculta la insignia.
- [x] No existen controles de "Copiar texto" ni "Imprimir / PDF".
- [x] El layout es de dos columnas con histórico sticky desde 960 px y de una columna por debajo.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [x] La consola del navegador no muestra advertencias de hidratación ni errores de React.
- [x] Hay capturas de 1440×900 y 390×844 guardadas en `.playwright-mcp/`.

---

## Decisiones tomadas y descartadas

- **Sí:** ruta `/` como home. La pantalla principal del producto es el reporte diario; login y registro vivirán en rutas aparte.
- **Sí:** estado en memoria, sin persistencia. Es fiel al prototipo ("Histórico de esta sesión") y el usuario confirmó que por ahora no se graba nada.
- **Sí:** íconos SVG propios de 24×24 con trazo lineal. Mantienen la consistencia visual del prototipo y la temática petrolera solicitada.
- **Sí:** Tailwind v4 con tokens oklch en `app/globals.css`. Es la convención del proyecto y evita agregar otra capa de estilos.
- **Sí:** calendario de 42 celdas con inicio en lunes. Reproduce el prototipo y evita saltos de altura entre meses.
- **Sí:** un componente cliente dueño del estado (`DailyReportPage`). El formulario y el histórico comparten reportes, fecha seleccionada y mes visible.
- **Sí:** observaciones obligatorias solo para `base`. En `pozo` la actividad ya describe el trabajo realizado, así que las observaciones quedan opcionales.
- **Sí:** copy en español e identificadores en inglés. Es la regla del proyecto.
- **No:** "Copiar texto" e "Imprimir / PDF". El usuario pidió quitarlas después de revisar el mock.
- **No:** localStorage o IndexedDB. La persistencia tendrá su propio spec cuando exista backend.
- **No:** librería de componentes (shadcn/ui u otra). El prototipo ya define el sistema visual y no se necesita otra dependencia.
- **No:** modo oscuro. El prototipo no lo contempla y no se pidió.
- **No:** edición o borrado de reportes. El prototipo solo agrega y consulta.
- **No:** pruebas automatizadas. El proyecto no tiene suite configurada; se verifica con typecheck, lint, build y Playwright.

---

## Riesgos identificados

| Riesgo                                                       | Mitigación                                                                                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Desajuste de hidratación por calcular `new Date()` en el SSR | Calcular la fecha de hoy dentro de `useEffect` y no renderizar contenido dependiente de la fecha hasta que el componente monte. |
| `next/font/google` requiere red durante el build             | Ejecutar el build en un entorno con red; dejar la pila de fuentes de respaldo definida en los tokens.                            |
| Los íconos pierden legibilidad a 20 px                       | Diseñarlos con trazo de 2 px, formas simples y probarlos en las capturas de Playwright.                                          |
| Las tarjetas de estado no son accesibles con teclado         | Usar `<input type="radio">` nativos dentro de `<label>`, `role="radiogroup"` y foco visible.                                     |
| Los tokens oklch no coinciden exactamente con el prototipo   | Copiar los valores del prototipo tal cual y comparar capturas lado a lado.                                                       |
| El histórico se pierde al recargar                           | Aceptado en este spec; la persistencia se resolverá en un spec posterior.                                                        |

---

## Lo que **no** incluye este spec

- Login, registro, recuperación de contraseña o sesión de usuario.
- Backend, API, base de datos o cualquier forma de persistencia.
- Acciones de copiar texto o imprimir/PDF.
- Edición, borrado o duplicado de reportes.
- Modo oscuro, i18n o multiempresa.
- Pruebas automatizadas.
- Cambios en los prototipos de login y registro.

Cada uno de esos puntos, si se implementa, va en su propio spec.
