# SPEC 05 — Login real y protección de rutas

> **Estado:** Implementado
> **Depende de:** SPEC 01 (reporte diario), SPEC 02 (acceso del empleado), SPEC 04 (registro en Supabase)
> **Reemplaza:** las decisiones del SPEC 02 sobre "sin backend, sesión ni redirección" y la nota del SPEC 04 que deja el login real, el logout y las rutas protegidas para un spec futuro.
> **Fecha:** 2026-11-06
> **Objetivo:** autenticar al empleado contra Supabase Auth desde `/login`, mantener la sesión con cookies, proteger todas las rutas salvo `/login` y `/register`, y permitir cerrar sesión desde el reporte.

---

## Por qué existe este spec

El SPEC 02 dejó `/login` con validación completa pero `authenticate()` siempre responde ok: no hay autenticación, no se crean cookies y no se navega a ninguna parte. El SPEC 04 ya crea cuentas reales en Supabase Auth, guarda el perfil en `public.employees` y deja al empleado autenticado tras el registro, pero el acceso manual sigue siendo simulado.

`proxy.ts` hoy solo refresca la sesión (`updateSession` → `getClaims`); no protege nada. Cualquiera puede abrir `/` sin sesión. Este spec conecta el login con Supabase, cierra el ciclo de sesión (entrar, navegar, salir) y convierte `/` en una ruta privada.

No hay cambios de esquema: `public.employees` ya tiene RLS para que cada empleado autenticado lea su propia fila.

---

## Decisiones tomadas

- **Sesión:** `@supabase/ssr` con cookies. El token nunca se guarda en `localStorage` ni se expone al cliente.
- **Login:** Server Action con `supabase.auth.signInWithPassword`. El formulario cliente solo envía correo y contraseña.
- **Protección por defecto:** todas las rutas son privadas salvo `/login` y `/register`. Las rutas futuras quedan protegidas sin tocar el proxy.
- **Doble capa:** el proxy hace el chequeo optimista (redirect rápido) y `app/page.tsx` llama a `requireSession()` antes de renderizar (defensa en profundidad).
- **Redirects solo en `GET`/`HEAD`:** el proxy no redirige POST de Server Actions. Las acciones protegidas futuras deben validar la sesión por su cuenta.
- **`next` seguro:** solo se aceptan rutas relativas que empiecen por `/`, sin `//`, sin `/\`, sin saltos de línea y sin volver a `/login`.
- **Errores genéricos:** credenciales inválidas siempre muestran el mismo mensaje; no se revela si el correo existe.
- **Logout visible:** botón "Salir" y ficha del empleado (código, nombre y cargo) en el hueco vacío del header del reporte (`components/report/DailyReportPage.tsx:57`).
- **Aviso de logout:** `/login?signedOut=1` muestra "Cerraste sesión correctamente." con el aviso `ok` que ya existe.
- **Sin "recordarme", recuperación de contraseña, MFA ni roles.** Cada uno, si se implementa, va en su propio spec.

---

## Alcance

**Incluye:**

- Server Action `loginAction` con validación de servidor, `signInWithPassword`, mapeo de errores y redirect.
- Server Action `logoutAction` con `signOut()` y redirect a `/login?signedOut=1`.
- Helpers de sesión `getSessionClaims`, `requireSession` y `getCurrentEmployee` (DTO del empleado).
- `proxy.ts` con reglas de protección: sin sesión a `/login?next=…`; con sesión, `/login` a `/`.
- Propagación de las cookies refrescadas en las respuestas de redirect del proxy.
- `/login` leyendo `next` y `signedOut` desde `searchParams`.
- Formulario de login conectado a la acción real, con estado "Verificando…" y aviso de error.
- Ficha del empleado autenticado y botón "Salir" en el header del reporte.
- `app/page.tsx` como componente servidor asíncrono que valida la sesión y pasa el empleado.
- Actualización de `AGENTS.md`, `README.md` y notas de reemplazo en los SPEC 02 y 04.
- Verificación con `npx tsc --noEmit`, `npm run lint`, `npm run build`, Playwright y capturas en `.playwright-mcp/`.

**Fuera de alcance:**

- Recuperación o cambio de contraseña.
- Opción "Mantener la sesión abierta", MFA, passkeys o login social.
- Roles, permisos por cargo o panel de administración.
- Rate limiting propio, captcha o bloqueo de cuentas.
- Persistencia de reportes en Supabase o Google Sheets desde este spec.
- Registro de auditoría de inicios de sesión.
- Pruebas automatizadas (no hay suite configurada).

---

## Contrato de autenticación

### `lib/auth.ts`

Se eliminan `authenticate()` y `AuthResult` (quedan sin uso). Se añade el DTO del empleado y el saneador de redirecciones:

```ts
export interface CurrentEmployee {
  employeeCode: string;
  fullName: string;
  cargo: string;
}

const UNSAFE_REDIRECT_PATH = /[\r\n\\]/;

/** Solo rutas internas; cualquier intento de salir del sitio cae en "/". */
export function resolveRedirectPath(value: unknown): string {
  if (typeof value !== "string") return "/";

  const path = value.trim();

  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  if (UNSAFE_REDIRECT_PATH.test(path)) return "/";
  if (path === "/login" || path.startsWith("/login?")) return "/";

  return path;
}
```

Reglas:

- `https://evil.com`, `//evil.com`, `/\evil.com`, `/login`, `/login?next=/x` y valores vacíos devuelven `/`.
- Se aceptan rutas con query string (`/?tab=historial`).
- El saneador se aplica dos veces: en la página (al leer `searchParams`) y en la acción (el cliente no es confiable).

### `app/actions/auth.ts`

```ts
"use server";

export interface LoginActionState {
  ok: boolean;
  message: string;
  errors?: LoginErrors;
}

export async function loginAction(
  values: LoginFormValues,
  redirectTo?: string,
): Promise<LoginActionState>;

export async function logoutAction(): Promise<void>;
```

Flujo de `loginAction`:

1. Normalizar: `email.trim().toLowerCase()`; la contraseña se usa tal cual.
2. `validateLogin()` en el servidor.
3. `signInWithPassword({ email, password })` con el cliente de cookies (`createServerSupabaseClient`).
4. Mapear el error de Supabase y devolver `{ ok: false, message }` sin exponer `error.message`.
5. `redirect(resolveRedirectPath(redirectTo))`. La acción nunca devuelve `ok: true`.

Errores:

| Caso | Código de Supabase | Respuesta |
| --- | --- | --- |
| Validación local | — | `message: "Revisa los campos marcados."` + `errors` |
| Credenciales inválidas | `invalid_credentials` | `"Correo o contraseña incorrectos."` |
| Correo sin confirmar | `email_not_confirmed` | `"Tu correo aún no está confirmado. Solicita un enlace nuevo de registro."` |
| Demasiados intentos | `over_request_rate_limit` | `"Demasiados intentos. Espera unos minutos e intenta de nuevo."` |
| Red/configuración | — | `"No pudimos iniciar sesión. Intenta de nuevo."` |

`logoutAction`:

```ts
try {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
} catch {
  // La sesión local se descarta igualmente al redirigir.
}

redirect("/login?signedOut=1");
```

La acción nunca registra la contraseña ni el token.

### `lib/supabase/session.ts` (nuevo, `server-only`)

```ts
import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { JwtPayload } from "@supabase/supabase-js";

import type { CurrentEmployee } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const getSessionClaims = cache(async (): Promise<JwtPayload | null> => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
});

export async function requireSession(): Promise<JwtPayload> {
  const claims = await getSessionClaims();

  if (!claims?.sub) redirect("/login");

  return claims;
}

export const getCurrentEmployee = cache(
  async (): Promise<CurrentEmployee | null> => {
    const claims = await getSessionClaims();

    if (!claims?.sub) return null;

    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("employees")
      .select("employee_code, full_name, cargo")
      .eq("id", claims.sub)
      .maybeSingle();

    if (!data) return null;

    return {
      employeeCode: data.employee_code,
      fullName: data.full_name,
      cargo: data.cargo,
    };
  },
);
```

Reglas:

- `requireSession()` redirige a `/login` si no hay `sub` en los claims.
- `getCurrentEmployee()` devuelve `null` si no hay sesión o si el usuario no tiene fila en `employees`; nunca lanza ni entra en bucle.
- Solo se seleccionan las columnas necesarias (DTO), no la fila completa.
- `cache()` evita repetir la llamada dentro del mismo render.

### `lib/supabase/proxy.ts`

`updateSession` conserva el orden actual (`createServerClient` → `getClaims`) y pasa a devolver los claims:

```ts
import type { JwtPayload } from "@supabase/supabase-js";

export interface SessionUpdate {
  response: NextResponse;
  claims: JwtPayload | null;
}

export async function updateSession(
  request: NextRequest,
): Promise<SessionUpdate> {
  // ...mismo createServerClient y setAll...

  const { data } = await supabase.auth.getClaims();

  return { response, claims: data?.claims ?? null };
}
```

### `proxy.ts`

```ts
const PUBLIC_PATHS = ["/login", "/register"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function copySessionCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));

  const cacheControl = source.headers.get("Cache-Control");
  if (cacheControl) target.headers.set("Cache-Control", cacheControl);

  return target;
}
```

Reglas:

| Método | Sesión | Ruta | Resultado |
| --- | --- | --- | --- |
| `GET`/`HEAD` | Sin sesión | Privada | `307` a `/login?next=<pathname+search>` |
| `GET`/`HEAD` | Con sesión | `/login` | `307` a `/` |
| `GET`/`HEAD` | Cualquiera | `/register` | Continúa |
| `POST`/otros | Cualquiera | Cualquiera | Solo refresca la sesión |

Notas:

- El redirect se construye con `request.nextUrl.clone()` y `searchParams.set("next", …)` para no codificar dos veces.
- En los redirects se copian las cookies y `Cache-Control` del response original; si no, el navegador pierde el token refrescado.
- `isPublicPath` acepta `/login` y `/login/…`, pero no `/login-algo`.
- El `matcher` actual no cambia.

---

## Interfaz

### `/login`

`app/login/page.tsx` pasa a servidor asíncrono:

```tsx
export default async function LoginRoute(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = resolveRedirectPath(rawNext);
  const signedOut = params.signedOut === "1";

  return (
    <LoginPage>
      <LoginForm nextPath={nextPath} signedOut={signedOut} />
    </LoginPage>
  );
}
```

Cambios en `LoginForm`:

- Props nuevas: `nextPath: string` y `signedOut?: boolean`.
- Se elimina `authenticate`, `timeoutRef`, el `useEffect` de limpieza y el `setTimeout` de 600 ms.
- `handleSubmit` pasa a `async`: valida, enfoca el primer error y llama `loginAction({ email, password }, nextPath)`.
- Mientras espera: botón deshabilitado con "Verificando…".
- Si `result.ok` es falso: pinta `errors`, muestra el aviso `mal` y enfoca el primer campo con error.
- Si la acción lanza: aviso genérico "No pudimos iniciar sesión. Intenta de nuevo.".
- `signedOut` inicializa el aviso `ok` "Cerraste sesión correctamente.".
- Editar un campo o alternar la visibilidad limpia errores y aviso, como hoy.
- Se conservan labels, `aria-invalid`, `aria-describedby`, `role="status"` y el botón Ver/Ocultar.
- No se añaden enlaces, "recordarme" ni "¿Olvidaste tu contraseña?".

### Header del reporte

`app/page.tsx` pasa a servidor asíncrono:

```tsx
export default async function Home() {
  await requireSession();
  const employee = await getCurrentEmployee();

  return <DailyReportPage employee={employee} />;
}
```

`components/report/DailyReportPage.tsx` recibe `employee: CurrentEmployee | null` y sustituye el `<div>` vacío del header por:

- Código del empleado en mono: `Código AVD12` (o "Sesión activa" si no hay fila).
- Nombre completo en tipografía display.
- Cargo en texto pequeño.
- `<LogoutButton />` al lado.

`components/auth/LogoutButton.tsx` (nuevo, cliente):

```tsx
"use client";

import { useFormStatus } from "react-dom";
import { logoutAction } from "@/app/actions/auth";

function LogoutSubmit() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Saliendo…" : "Salir"}
    </button>
  );
}

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <LogoutSubmit />
    </form>
  );
}
```

Estilo: botón outline sobre el header `--primary`, mono en mayúsculas, foco visible, `disabled:opacity-60`. En móvil el bloque del header hace wrap y la ficha queda alineada a la izquierda; desde `sm` se alinea a la derecha.

---

## Archivos nuevos y cambios

```
app/actions/auth.ts                      # nuevo: loginAction + logoutAction
lib/supabase/session.ts                  # nuevo: claims, requireSession, getCurrentEmployee
components/auth/LogoutButton.tsx         # nuevo: form action + estado pendiente
specs/05-login-proteccion-rutas.md       # este spec
lib/auth.ts                              # quitar authenticate/AuthResult; CurrentEmployee + resolveRedirectPath
components/auth/LoginForm.tsx            # acción real, nextPath, signedOut, sin setTimeout
app/login/page.tsx                       # searchParams next/signedOut
lib/supabase/proxy.ts                    # updateSession devuelve claims
proxy.ts                                 # default-deny + redirects con cookies
app/page.tsx                             # requireSession + getCurrentEmployee
components/report/DailyReportPage.tsx    # ficha del empleado + LogoutButton
AGENTS.md                                # login real, logout y rutas protegidas
README.md                                # flujo de acceso y alcance
specs/02-login-empleado.md               # nota de reemplazo
specs/04-registro-empleado-supabase.md   # nota de reemplazo
```

No hay migraciones ni cambios en `supabase/`.

---

## Plan de implementación

1. **Dominio.** Quitar `authenticate` y `AuthResult` de `lib/auth.ts`; añadir `CurrentEmployee` y `resolveRedirectPath`.
2. **Sesión.** Crear `lib/supabase/session.ts` con `getSessionClaims`, `requireSession` y `getCurrentEmployee`; comprobar que `npx tsc --noEmit` compila.
3. **Acciones.** Crear `app/actions/auth.ts` con `loginAction` (normalizar → validar → `signInWithPassword` → mapear errores → redirect) y `logoutAction`.
4. **Proxy.** Cambiar `updateSession` para devolver `{ response, claims }`; reescribir `proxy.ts` con default-deny, redirects solo de navegación y copia de cookies.
5. **Login.** Leer `next` y `signedOut` en la página; conectar `LoginForm` a la acción y eliminar la simulación.
6. **Reporte.** `app/page.tsx` valida sesión y pasa el empleado; añadir ficha y `LogoutButton` al header.
7. **Documentación.** Actualizar `AGENTS.md`, `README.md` y las notas de reemplazo de los SPEC 02 y 04.
8. **Verificación.** `npx tsc --noEmit`, `npm run lint`, `npm run build`; flujos de Playwright; `get_advisors` (security); limpiar los usuarios de prueba.

---

## Criterios de aceptación

- [x] Sin sesión, `GET /` responde `307` a `/login?next=%2F`.
- [x] Sin sesión, cualquier ruta privada (por ejemplo `/reportes`) redirige a `/login` con `next`.
- [x] Sin sesión, `/register?code=AB12C` sigue siendo accesible y no redirige.
- [x] Con sesión, `GET /login` redirige a `/`.
- [x] Un login válido crea las cookies `sb-*-auth-token` y llega a `/` (o al `next` saneado).
- [x] Un login válido desde `/login?next=%2F` aterriza en `/`, no en `/login`.
- [x] Credenciales inválidas muestran "Correo o contraseña incorrectos." sin crear cookies de sesión.
- [x] Un correo inexistente y una contraseña incorrecta muestran exactamente el mismo mensaje.
- [x] Mientras la acción está en curso, el botón queda deshabilitado y su texto es "Verificando…".
- [x] Editar un campo limpia su error y el aviso; el foco va al primer campo inválido.
- [x] `next=https://evil.com`, `next=//evil.com`, `next=/\evil.com`, `next=/login` y `next` vacío redirigen a `/`.
- [x] Los redirects del proxy conservan las cookies refrescadas; la sesión no se pierde al navegar.
- [x] Un `POST` de Server Action no es redirigido por el proxy (solo `GET`/`HEAD`).
- [x] Tras "Salir", las cookies se borran, se llega a `/login?signedOut=1` y se muestra "Cerraste sesión correctamente.".
- [x] Tras "Salir", `GET /` vuelve a redirigir a `/login`.
- [x] El header del reporte muestra código, nombre y cargo del empleado autenticado.
- [x] Si el usuario autenticado no tiene fila en `employees`, el reporte sigue cargando sin bucle y el header muestra "Sesión activa".
- [x] `requireSession()` protege `/` aunque el proxy no intervenga.
- [x] `authenticate()` y `AuthResult` ya no existen en el repositorio.
- [x] La contraseña no aparece en logs, cookies legibles ni respuestas de la acción.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.
- [x] `/` y `/login` se compilan como dinámicas (`ƒ`).
- [x] La consola no muestra errores de React ni advertencias de hidratación.
- [x] Hay capturas de 1440×900 y 390×844 en `.playwright-mcp/`.
- [x] Los usuarios de prueba se eliminan al final y `auth.users` / `public.employees` quedan como estaban.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Bucle `/login` ↔ `/` | Solo se redirige `/login` cuando hay sesión; `next` nunca puede ser `/login`. |
| Open redirect | `resolveRedirectPath` se aplica en la página y en la acción; se rechazan `//`, `/\`, saltos de línea y URLs absolutas. |
| Perder el refresh token en un redirect | `copySessionCookies` copia cookies y `Cache-Control` del response de `updateSession`. |
| Romper Server Actions con un `307` | El proxy solo redirige `GET`/`HEAD`; las acciones protegidas futuras validan sesión por su cuenta. |
| Fuerza bruta o credential stuffing | Se aceptan los límites de Supabase Auth; rate limiting propio queda fuera. |
| Enumeración de correos | Un solo mensaje para credenciales inválidas. |
| Usuario autenticado sin fila en `employees` | `getCurrentEmployee()` devuelve `null` y el header muestra "Sesión activa"; no hay redirect. |
| Latencia extra por `getClaims` | Con claves asimétricas la verificación es local; con simétricas Supabase responde rápido y el proxy ya lo hacía. |
| Cookies en un dominio mal configurado | `@supabase/ssr` usa `HttpOnly`, `SameSite=Lax` y `Secure` en producción; no se tocan opciones a mano. |
| Usuarios de prueba reales | Código y correo desechables; borrado con la Admin API al terminar. |
| Logout CSRF | Server Action con verificación de origen de Next; `signOut` es idempotente. |
| Dependencia del proxy para toda la seguridad | `requireSession()` en la página y RLS en la base de datos como segunda y tercera capa. |

---

## Prerrequisitos para implementar

1. `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY` (ya están).
2. Proveedor Email de Supabase Auth activo (el registro del SPEC 04 ya lo usa).
3. Una cuenta desechable creada vía `/register?code=…` para probar login y logout; se elimina al terminar.
4. Confirmar que `public.employees` conserva la política "Employees can read their own record" (SPEC 04).
5. No se requiere migración ni cambio de esquema.

---

## Lo que **no** incluye este spec

- Recuperación o cambio de contraseña.
- "Mantener la sesión abierta", MFA, passkeys o login social.
- Roles, permisos por cargo o panel de administración.
- Rate limiting propio, captcha o bloqueo de cuentas.
- Persistencia de reportes en Supabase o Google Sheets.
- Registro de auditoría de inicios de sesión.
- Pruebas automatizadas.

---

## Registro de verificación

**Fecha:** 2026-11-06
**Entorno:** Windows, Next.js 16.3.4, proyecto Supabase `uvuwrtytwvfdfrpiveod`. Flujos con dev server en `http://localhost:3000` y comprobación de logs con `next start` en `http://localhost:3001`.
**Secretos:** `SUPABASE_SECRET_KEY` presente en `.env.local` (valor enmascarado; no se expone en este registro).

### Comandos

| Comando | Resultado |
| --- | --- |
| `npx tsc --noEmit` | ✅ exit 0, sin errores |
| `npm run lint` | ✅ exit 0, sin avisos |
| `npm run build` | ✅ exit 0; `ƒ /`, `ƒ /login` y `ƒ /register` compiladas como dinámicas |

### Criterios

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Sin sesión, `GET /` → `307 /login?next=%2F` | ✅ Verificado | `curl -D -`: `HTTP/1.1 307 Temporary Redirect` + `location: /login?next=%2F`. |
| Sin sesión, ruta privada (`/reportes`) → `/login` con `next` | ✅ Verificado | `location: /login?next=%2Freportes`; `proxy.ts:33`. |
| Sin sesión, `/register?code=AB12C` accesible | ✅ Verificado | `HTTP/1.1 200`, sin `location`. |
| Con sesión, `GET /login` → `/` | ✅ Verificado | Playwright: `goto /login` termina en `http://localhost:3000/`; `proxy.ts:42`. |
| Login válido crea `sb-*-auth-token` y llega a `/` | ✅ Verificado | Cookie `sb-uvuwrtytwvfdfrpiveod-auth-token`; URL final `/`; `actions/auth.ts:57-69`. |
| Login desde `/login?next=%2F` aterriza en `/` | ✅ Verificado | Playwright: `/login?next=%2F` → `/`. |
| Credenciales inválidas: mensaje y sin cookies | ✅ Verificado | "Correo o contraseña incorrectos."; `context.cookies()` = `[]`; `actions/auth.ts:27-36,63`. |
| Correo inexistente = contraseña incorrecta | ✅ Verificado | Ambos casos devuelven exactamente "Correo o contraseña incorrectos." (mismo `invalid_credentials`). |
| "Verificando…" y botón deshabilitado | ✅ Verificado | `{text:"Verificando…", disabled:true}` leído justo tras el clic; `05-login-verificando-1440x900.png`. |
| Editar limpia error/aviso y foco al primer inválido | ✅ Verificado | Envío vacío → `document.activeElement.id = "login-email"`; al escribir, `#login-email-error` desaparece. |
| `next` peligrosos → `/` | ✅ Verificado | `https://evil.com`, `//evil.com`, `/\evil.com`, `/login` y vacío: los cinco aterrizan en `/`; `lib/auth.ts:16-29`. |
| Redirects conservan cookies; sesión estable | ✅ Verificado | Tras el login, varias navegaciones y el redirect `/login` → `/` mantienen la cookie sin reautenticar; `proxy.ts:17-23`. |
| `POST` de Server Action no redirigido | ✅ Verificado | `POST /reportes` → `404` (vs `GET` → `307`); `POST /` ejecuta `ƒ logoutAction()` y responde `200`; `proxy.ts:26`. |
| Logout: cookies borradas, aviso y `/` vuelve a redirigir | ✅ Verificado | URL `/login?signedOut=1`, `cookies=[]`, aviso "Cerraste sesión correctamente."; después `GET /` → `307 /login?next=%2F`. |
| Header con código, nombre y cargo | ✅ Verificado | Banner: `CÓDIGO Q7W2E` / `Empleado Spec Cinco` / `Operador de campo` / `SALIR`. |
| Sin fila en `employees`: "Sesión activa", sin bucle | ✅ Verificado | Fila borrada vía SQL; `/` carga y el header muestra `SESIÓN ACTIVA`; `session.ts:28-48`. |
| `requireSession()` protege `/` | ✅ Verificado | `app/page.tsx:16` (`await requireSession()`); `session.ts:19-25`. |
| `authenticate()` y `AuthResult` fuera del repo | ✅ Verificado | `grep` sobre `*.ts`/`*.tsx`: 0 coincidencias (solo quedan menciones históricas en los SPEC 02/03). |
| La contraseña no aparece en logs, cookies ni respuestas | ✅ Verificado | Producción (`next start`): 0 líneas de log con la acción; cookies solo con el JWT; las respuestas solo llevan `message`/`errors`. En `next dev` Next imprime los argumentos de las Server Actions: ver observaciones. |
| `tsc`, `lint` y `build` pasan | ✅ Verificado | Ver tabla de comandos. |
| `/` y `/login` dinámicas (`ƒ`) | ✅ Verificado | Salida de `next build`. |
| Consola sin errores de React ni hidratación | ✅ Verificado | 47 mensajes, 0 errores y 0 warnings en todo el recorrido. |
| Capturas 1440×900 y 390×844 | ✅ Verificado | `05-login-1440x900.png`, `05-login-390x844.png`, `05-login-signedout-1440x900.png`, `05-login-signedout-390x844.png`, `05-reporte-1440x900.png`, `05-reporte-390x844.png`, `05-reporte-sin-fila-1440x900.png`, `05-login-verificando-1440x900.png`. |
| Usuarios de prueba eliminados | ✅ Verificado | `auth.users = 1`, `public.employees = 1` (`AVD12`), igual que al inicio. |

### Limpieza

Se crearon dos cuentas desechables vía `/register?code=…` (`Q7W2E` y `M4N8P`). Ambas se borraron con SQL sobre `auth.users` (cascade a `public.employees`). Verificación final: `auth.users = 1`, `public.employees = 1`, sin correos `spec05.*`.

### Observaciones (no bloqueantes)

- **Logs de desarrollo:** `next dev` imprime los argumentos de cada Server Action, incluida la contraseña (`└─ ƒ loginAction({...})`). Es instrumentación solo de desarrollo: con `next start` no se registra nada y la acción nunca escribe logs. Riesgo aceptado; no se cambia el contrato de `loginAction` por ello.
- **Cookie no `HttpOnly`:** la cookie `sb-*-auth-token` sale con `httpOnly=false` por defecto en `@supabase/ssr` (el cliente necesita leerla). La tabla de riesgos asume `HttpOnly`; no se tocan las opciones a mano, como pide el spec. La contraseña nunca viaja en la cookie.
- **Advisors (security):** solo el aviso preexistente `auth_leaked_password_protection` (WARN). Este spec no cambia el esquema, así que no introduce hallazgos nuevos.
- `POST /` sin cabecera de Server Action devuelve `307 /login`: no lo produce el proxy (que solo redirige `GET`/`HEAD`), sino `requireSession()` al renderizar la página.
- Durante las pruebas manuales el dev server registró credenciales reales en su log local; no se incluyen en este registro y conviene no compartir ese archivo.
- **Pendiente para un spec futuro:** con sesión activa, `/register` sigue sirviéndose (decisión de este spec). Tiene sentido expulsar a `/` igual que `/login`; queda anotado como posible SPEC 06 y no se implementa aquí para no invalidar la verificación.
