This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Google Sheets

La app lee el mes del empleado autenticado desde el libro **CUADRO DE PERSONAL 2026**
y guarda el reporte del día en la celda correspondiente, todo mediante una cuenta de
servicio (no usa el login de Google del usuario).

### Credenciales

1. En el proyecto de Google Cloud, habilita **Google Sheets API**.
2. Crea una **cuenta de servicio** y descarga su clave JSON.
3. Comparte el spreadsheet con el email de la cuenta de servicio (`...@....iam.gserviceaccount.com`): **Viewer** basta para leer; **Editor** hace falta para `write`.
4. Guarda la clave en `secrets/service-account.json` (ignorada por git) y copia `.env.example` a `.env.local`.

Variables:

| Variable | Uso |
| --- | --- |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Id del libro |
| `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` | Ruta al JSON de la cuenta de servicio (local) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Alternativa para despliegue |

### Comandos

```bash
npm run sheets:check                                  # resumen del mes actual
npm run sheets:check -- tabs                          # pestañas del libro
npm run sheets:check -- employees 2026-11-05          # empleados del mes
npm run sheets:check -- read "LUIS AREVALO" 2026-11-05
npm run sheets:check -- write "LUIS AREVALO" 2026-11-05 DE --yes
npm run sheets:check -- write AVD12 2026-11-06 ED --note "SFRA100 TRZ · Cambio de sarta" --yes
npm run sheets:check -- month AVD12 2026-11           # días traducidos + notas
```

`month` acepta cualquier identificador de la columna A (código de 5 caracteres u
ObjectId), imprime una línea por día con el estado traducido y añade la nota de la
casilla cuando existe. `read` imprime el código y la nota actuales. `write` exige
`--yes` y escribe valor y nota con el mismo `batchUpdate`/`updateCells` que usa la
app; `--note` es opcional y por defecto deja la nota vacía. Es solo diagnóstico: la
app no lo usa.

### Estructura de la hoja

- `A` = id del sistema anterior, `B` = nombre; una fila con solo `B` es un encabezado de sección.
- `C`…`AG` = días 1…31 (fila 5 = día de la semana, fila 6 = número de día).
- Códigos de la leyenda: `V` vacaciones, `F` festivo, `I` incapacidad, `D` día, `N` noche, `DE` descanso, `L` licencia, `B` base, `OD` sin definir.

### Carga del mes

- Al renderizar `/`, después de `requireSession()`, `app/page.tsx` busca el `employee_code` del empleado en la **columna A** de la pestaña del mes y arma sus días.
- Cada cambio de mes (anterior, siguiente, "Hoy" o clic en un día vecino) llama a `loadMonthReportsAction`, que lee de nuevo la hoja sin caché.
- Traducción de la casilla: `DE` → descanso, `BA` → base, `LI` → licencia; `FE` y vacío se omiten; cualquier otro código (`ED`, `EN`, `OD`, `V`, `F`…) → pozo.
- Las notas se parsean con `parseSheetNote`: en un día de pozo, `SFRA099 ILT` llena **Pozo** y **Actividad realizada**; el resto (` · ` seguido de texto) va a **Observaciones**. En estados que no son pozo, toda la nota es observaciones.
- El código original se conserva como etiqueta junto al estado.
- Si el día no tiene valor ni nota, el formulario queda vacío con la fecha elegida. Si el código no aparece en el mes, se muestra un aviso neutro. Si falla Google (credenciales, red, permisos), `/` no falla: muestra `No pudimos leer la hoja de cálculo. Intenta de nuevo.`
- No hay caché: cada cambio de mes y cada carga de día vuelven a leer la hoja.

### Guardado del día

- Solo se puede reportar **hoy** y **ayer**, según la fecha del servidor (`getTodayLocal()`). `app/page.tsx` calcula `serverToday`, el input usa `min`/`max` y `saveDayReportAction` vuelve a validar con su propia fecha; el navegador no decide el rango. El despliegue debe usar la zona horaria de la operación (America/Bogota).
- Al entrar a `/`, el formulario carga el día de hoy desde la hoja; al cambiar la fecha a ayer, carga ese día. El calendario lateral no cambia la fecha del formulario.
- `saveEmployeeDay` escribe el valor y la nota en una sola llamada `batchUpdate`/`updateCells` (`fields: "userEnteredValue,note"`), así que el formato de la celda se conserva.
- Códigos canónicos: `base = BA`, `pozo = ED`, `descanso = DE`, `licencia = LI`. Si la celda ya tiene un código que traduce al mismo estado (`ED`, `EN`, `V`…), se conserva; `FE` y vacío siempre se reemplazan.
- Formato de la nota: `pozo actividad` y, si hay observaciones, `pozo actividad · observaciones`; en los demás estados, solo observaciones. Los saltos de línea se normalizan a espacios.
- El botón dice **Guardar reporte** (**Guardando…** mientras guarda) y la confirmación **Reporte guardado** se oculta con cualquier edición. **Limpiar** vacía el formulario pero no borra la hoja.
- No hay confirmación de sobrescritura, historial de cambios ni control de concurrencia: gana la última escritura.
- La cuenta de servicio necesita permiso **Editor** para guardar.

Código: `lib/sheets/client.ts` (auth + API + escritura de celda), `lib/sheets/layout.ts` (pestañas, columnas, empleados), `lib/sheets/day.ts` (carga y guardado de un día), `lib/sheets/month.ts` (carga del mes), `app/actions/sheet.ts` (Server Actions) y `lib/report.ts` (tipos, traducción, parser de notas y fechas).

## Supabase

El registro de empleados (`/register?code=XXXXX`) y el acceso (`/login`) persisten y verifican contra Supabase.

### Variables

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto (`https://uvuwrtytwvfdfrpiveod.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública, puede ir al cliente |
| `SUPABASE_SECRET_KEY` | Clave secreta, **solo servidor** (nunca con prefijo `NEXT_PUBLIC_`) |

Copia `.env.example` a `.env.local` y añade la secret key desde Dashboard → Settings → API Keys. En Vercel configura las tres variables.

### Flujo de registro

1. El enlace de registro incluye `?code=AB12C`; el formulario lo normaliza y lo muestra en un campo no editable.
2. `app/register/actions.ts` valida en el servidor, comprueba duplicados y crea el usuario con la Admin API (`email_confirm: true`).
3. El trigger `private.handle_new_employee()` inserta el perfil en `public.employees` en la misma transacción.
4. La acción inicia sesión con cookies (`@supabase/ssr`) y redirige a `/`.
5. `proxy.ts` refresca la sesión en cada petición y protege las rutas privadas.

Si falta el `code` o no tiene 5 caracteres con letra y dígito, el formulario muestra un aviso y bloquea el envío.

### Migraciones

```bash
npx supabase migration new <nombre>
```

Se aplican con el MCP de Supabase (`apply_migration`) usando el mismo SQL del archivo; después el archivo local se renombra con la versión que devuelve `list_migrations`. El historial vive en `supabase_migrations.schema_migrations`. No se edita una migración ya aplicada ni se aplica esquema solo desde el dashboard.

### Flujo de acceso

1. `/login` pide correo y contraseña; `app/actions/auth.ts` valida en el servidor y llama `signInWithPassword`.
2. `@supabase/ssr` guarda la sesión en cookies `HttpOnly`; el token nunca va a `localStorage`.
3. La acción redirige a `/` o al `next` saneado (solo rutas internas; `//`, `/\`, saltos de línea y `/login` caen en `/`).
4. `proxy.ts` protege por defecto: sin sesión, cualquier ruta privada responde `307` a `/login?next=…`; con sesión, `/login` va a `/`. Solo `/login` y `/register` son públicas.
5. `app/page.tsx` vuelve a exigir sesión con `requireSession()` y el header del reporte muestra código, nombre y cargo del empleado.
6. "Salir" ejecuta `logoutAction`, borra las cookies y vuelve a `/login?signedOut=1`.

Credenciales inválidas muestran siempre "Correo o contraseña incorrectos.", sin revelar si el correo existe. Quedan fuera de este alcance la recuperación de contraseña, "recordarme", MFA, roles y el rate limiting propio.

### Alcance

La sesión, el login real, el logout y la protección de rutas están implementados (SPEC 05). La carga del mes y el guardado del reporte en Google Sheets están implementados (SPEC 06 y SPEC 07): `/` lee el mes del empleado autenticado, carga el día seleccionado, lo guarda en la celda y solo permite hoy o ayer. Persistir los reportes en Supabase sigue pendiente.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
