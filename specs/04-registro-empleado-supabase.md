# SPEC 04 — Registro del empleado en Supabase

> **Estado:** Aprobado
> **Depende de:** SPEC 03 (registro del empleado), SPEC 01 (sistema visual)
> **Reemplaza:** las decisiones del SPEC 03 sobre registro simulado, "sin red" y "sin redirección".
> **Fecha:** 2026-11-06
> **Objetivo:** persistir el registro en Supabase, tomar el código de empleado desde `?code=`, mostrarlo en un campo no editable, guardar el perfil en una tabla aparte y dejar al empleado autenticado en `/`.

---

## Por qué existe este spec

El SPEC 03 dejó `/register` con validación completa pero `registerEmployee()` siempre responde ok: no hay persistencia, sesión ni vínculo con el empleado real. El código de 5 caracteres ya existe en la pantalla, pero hoy se puede escribir a mano. El negocio necesita que ese código venga firmado en el enlace, sea inmutable y quede guardado como identificador de la fila del empleado en el Google Sheet.

La cuenta de acceso se crea con Supabase Auth; los datos del empleado van a `public.employees`, una fila por usuario. La contraseña nunca sale de Supabase Auth.

---

## Decisiones tomadas

- **Código:** solo se valida formato (`^[A-Z0-9]{5}$` con letra y dígito) y unicidad en Supabase. **No** se consulta Google Sheets en este spec.
- **Cuenta:** `auth.admin.createUser` con la secret key del servidor, `email_confirm: true`. No se envían correos.
- **Perfil:** `public.employees`, 1:1 con `auth.users`, con el código como dato único.
- **Post-registro:** inicio de sesión automático con cookies (`@supabase/ssr`) y `redirect("/")`.
- **Login:** `/login` sigue con el stub `authenticate()`; migrarlo es el SPEC 05.

---

## Alcance

**Incluye:**

- Ruta `/register?code=...`: leer `searchParams` en el servidor, normalizar el valor y pasarlo al formulario.
- Campo "Código de empleado" en `readOnly`, sin `onChange` ni pegado, con estilo bloqueado y texto de ayuda.
- Enlace sin `code` o con código inválido: aviso bloqueante y botón de envío deshabilitado.
- Server Action de registro con validación de servidor y Admin API de Supabase.
- Migración SQL: tabla `employees`, constraints, RLS, grants y trigger sobre `auth.users`.
- Migración versionada en `supabase/migrations/` y registrada en el historial del proyecto (`supabase_migrations.schema_migrations`).
- Auto-login y redirección a `/`.
- Variables de entorno, dependencias fijadas y `proxy.ts` para refrescar la sesión.
- Actualización de `AGENTS.md`, `README.md`, `.env.example` y nota de reemplazo en el SPEC 03.

**Fuera de alcance:**

- Login real, logout, recuperación de contraseña o rutas protegidas.
- Validación del código contra Google Sheets o tabla de códigos sembrada.
- Rate limiting, captcha o invitaciones de un solo uso.
- Edición o baja de empleados.
- Pruebas automatizadas.

---

## Contrato de datos

### Tabla

```sql
create table public.employees (
  id uuid primary key references auth.users (id) on delete cascade,
  employee_code text not null unique
    check (employee_code ~ '^[A-Z0-9]{5}$'),
  full_name text not null
    check (char_length(btrim(full_name)) between 1 and 120),
  email text not null unique
    check (email = lower(email)),
  area text not null
    check (char_length(btrim(area)) between 1 and 80),
  created_at timestamptz not null default now()
);

alter table public.employees enable row level security;

grant select on public.employees to authenticated;

create policy "Employees can read their own record"
  on public.employees
  for select
  to authenticated
  using ((select auth.uid()) = id);
```

Sin políticas de insert/update/delete: solo la secret key (que omite RLS) escribe.

### Trigger de perfil

```sql
create schema if not exists private;

create or replace function private.handle_new_employee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.employees (id, employee_code, full_name, email, area)
  values (
    new.id,
    new.raw_user_meta_data ->> 'employee_code',
    new.raw_user_meta_data ->> 'full_name',
    lower(new.email),
    new.raw_user_meta_data ->> 'area'
  );
  return new;
end;
$$;

revoke all on function private.handle_new_employee() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_employee();
```

La creación de usuario y perfil queda en la misma transacción: si falla el insert, no queda usuario huérfano.

### Migraciones versionadas

La migración no se aplica solo desde el editor SQL ni se deja únicamente en el remoto: debe quedar versionada en el repo **y** registrada en el historial del proyecto.

Archivos:

```
supabase/config.toml
supabase/migrations/<version>_create_employees.sql
```

Flujo obligatorio:

1. `npx supabase init` (solo la primera vez) para crear `supabase/config.toml`.
2. `npx supabase migration new create_employees` para generar el archivo con timestamp.
3. Escribir el SQL completo (tabla, constraints, RLS, grants, función y trigger) en ese archivo.
4. Aplicarlo con el MCP `apply_migration` usando `name: "create_employees"` y exactamente el mismo SQL del archivo.
5. Consultar `list_migrations` y renombrar el archivo local a `<version>_create_employees.sql`, usando la versión que Supabase registró.
6. Verificar en `supabase_migrations.schema_migrations` que la versión aparece una sola vez y con el nombre `create_employees`.
7. Commitear `supabase/config.toml` y `supabase/migrations/<version>_create_employees.sql` junto con el código.

Reglas:

- El archivo de `supabase/migrations/` es la fuente de verdad; el SQL aplicado por el MCP debe ser idéntico.
- Una migración aplicada no se edita: cualquier cambio posterior va en una migración nueva creada con `npx supabase migration new <nombre>`.
- `supabase/config.toml` y `supabase/migrations/` se versionan en git; `supabase/.gitignore` conserva solo lo local (`.branches`, `.temp`).
- En este spec no se usa `supabase db reset` ni `supabase db push`; la aplicación se hace con el MCP ya autenticado.
- Si `apply_migration` no devuelve la versión, se obtiene con `list_migrations` antes de renombrar el archivo.

### Contrato de la Server Action

```ts
// app/register/actions.ts
"use server";

export interface RegisterActionState {
  ok: boolean;
  message: string;
  errors?: RegisterErrors; // reutiliza el tipo de lib/auth.ts
}

export async function registerEmployeeAction(
  values: RegisterFormValues,
): Promise<RegisterActionState>;
```

Flujo:

1. `normalizeEmployeeCode(values.code)` y `validateRegistration()` en el servidor. El cliente no es confiable.
2. Consultar `employees` por `employee_code` y por `email` con el cliente admin:
   - código ocupado → `errors.code = "Ese código ya está registrado."`
   - correo ocupado → `errors.email = "Ese correo ya está registrado."`
3. `admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { employee_code, full_name, area } })`.
4. `supabase.auth.signInWithPassword({ email, password })` con el cliente de cookies.
5. `redirect("/")`.

Errores:

| Caso | Respuesta |
| --- | --- |
| Validación local | `message: "Revisa los campos marcados."` + `errors` |
| Correo existente (`email_exists`) | `errors.email = "Ese correo ya está registrado."` |
| Código duplicado (constraint o trigger) | `errors.code = "Ese código ya está registrado."` |
| Fallo de red/configuración | `"No pudimos completar el registro. Intenta de nuevo."` |
| Usuario creado pero login falla | `"Tu cuenta se creó, pero no pudimos iniciar sesión. Ve a /login."` |

La acción nunca registra la contraseña ni la guarda fuera de Supabase Auth.

### Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=https://uvuwrtytwvfdfrpiveod.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...   # solo servidor, nunca NEXT_PUBLIC
```

`.env.local` y Vercel necesitan `SUPABASE_SECRET_KEY`; hoy no está. Sin ella el registro no funciona.

---

## Interfaz

`app/register/page.tsx` pasa a ser servidor asíncrono:

```tsx
export default async function RegisterRoute(props: PageProps<"/register">) {
  const params = await props.searchParams;
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = normalizeEmployeeCode(raw ?? "");
  return (
    <RegisterPage>
      <RegisterForm initialCode={code} hasCodeParam={Boolean(raw)} />
    </RegisterPage>
  );
}
```

Cambios en `RegisterForm`:

- El input de código usa `value={initialCode}`, `readOnly`, `aria-readonly="true"` y no tiene `onChange`/`onPaste`.
- Se elimina `handleCodePaste`, `handleCodeChange` y el `setTimeout` de 600 ms.
- Estilo bloqueado: fondo `--muted`, texto `--muted-foreground`, `cursor-not-allowed`, mismo tamaño mono/tracking.
- Ayuda bajo el label: "Este código viene incluido en el enlace de registro."
- Si `hasCodeParam` es falso o el código no cumple `EMPLOYEE_CODE_PATTERN` + letra + dígito:
  - aviso `role="alert"`: "El enlace no incluye un código de empleado válido. Solicita un enlace nuevo."
  - botón enviar deshabilitado.
- El envío válido llama `registerEmployeeAction(values)`; mientras espera, botón deshabilitado con "Registrando…".
- Los errores de la acción se combinan con los locales y se enfoca el primer campo inválido, igual que hoy.
- Sin enlaces, sin pie de página, sin ficha resumen.
- Se conserva la normalización visual del código, pero ya no es editable.

---

## Archivos nuevos y cambios

```
app/register/page.tsx              # async + searchParams
app/register/actions.ts            # "use server" + Admin API + signIn + redirect
components/auth/RegisterForm.tsx   # código readOnly, envío real, estados de error
lib/auth.ts                        # quitar stub registerEmployee; exponer helpers de código
lib/supabase/admin.ts              # createClient con SUPABASE_SECRET_KEY (server-only)
lib/supabase/server.ts             # createServerClient con cookies
lib/supabase/proxy.ts              # updateSession + getClaims
proxy.ts                           # convención Next 16 (reemplaza middleware)
supabase/config.toml               # configuración del proyecto Supabase
supabase/migrations/<version>_create_employees.sql
.env.example                       # variables de Supabase
README.md                          # sección Supabase
AGENTS.md                          # reglas del registro con enlace
specs/03-registro-empleado.md      # nota de reemplazo
```

Dependencias fijadas: `@supabase/ssr@0.12.7` y `@supabase/supabase-js@2.119.0` (`--save-exact`).

---

## Plan de implementación

1. **Dependencias y entorno.** Instalar versiones exactas y documentar las tres variables en `.env.example`.
2. **Migración versionada.** Ejecutar `npx supabase init` y `npx supabase migration new create_employees`, escribir el SQL en el archivo, aplicarlo con `apply_migration` y alinear el nombre local con la versión registrada en `list_migrations`. Verificar con `list_tables`, `list_migrations` y `get_advisors` (security). El archivo de migración y `supabase/config.toml` quedan commiteados.
3. **Clientes Supabase.** `admin.ts` con `import "server-only"`, `server.ts` con cookies, `proxy.ts` raíz y `lib/supabase/proxy.ts`.
4. **Dominio.** Quitar el stub `registerEmployee` de `lib/auth.ts`; el resultado de la acción vive en `actions.ts`.
5. **Server Action.** Validar, pre-chequear duplicados, crear usuario, iniciar sesión y redirigir. Mapear errores de Auth y de constraints.
6. **Página.** Leer `?code=`, normalizar, detectar enlace inválido y pasar props.
7. **Formulario.** Código readOnly, quitar simulación, conectar la acción, conservar foco y accesibilidad.
8. **Auto-login.** Confirmar que las cookies de sesión quedan escritas antes del redirect y que `/` carga sin errores.
9. **Documentación.** Actualizar `AGENTS.md`, `README.md` y anotar en el SPEC 03 qué quedó reemplazado.
10. **Verificación.** `npx tsc --noEmit`, `npm run lint`, `npm run build`; Playwright para enlace válido, sin `code`, código inválido, código duplicado y correo duplicado; capturas 1440×900 y 390×844 en `.playwright-mcp/`; limpiar los usuarios de prueba.

---

## Criterios de aceptación

- [ ] `/register?code=ab-12c` muestra el código como `AB12C`.
- [ ] El campo de código es `readOnly`, no acepta teclado ni pegado y sigue enviándose.
- [ ] `/register` sin `code` muestra el aviso de enlace inválido y no permite enviar.
- [ ] `/register?code=ABC` muestra el aviso de enlace inválido y no permite enviar.
- [ ] Un envío válido crea un usuario en `auth.users` y una fila en `public.employees` con el mismo `id`, `employee_code`, `full_name`, `email` y `area`.
- [ ] El código se guarda en mayúsculas y sin caracteres inválidos.
- [ ] La contraseña no aparece en `employees`, en logs ni en metadata.
- [ ] Un código ya registrado responde "Ese código ya está registrado." sin crear usuario.
- [ ] Un correo ya registrado responde "Ese correo ya está registrado." sin crear usuario.
- [ ] Si el trigger falla, no queda un usuario huérfano en `auth.users`.
- [ ] Tras un registro válido, el navegador queda con sesión y llega a `/`.
- [ ] Un usuario autenticado solo puede leer su propia fila de `employees`; `anon` no lee nada.
- [ ] Existe `supabase/migrations/<version>_create_employees.sql` con la tabla, RLS, grants, función y trigger, y está commiteado.
- [ ] `list_migrations` y `supabase_migrations.schema_migrations` muestran una sola migración `create_employees` con la misma versión del archivo local.
- [ ] Reejecutar el flujo no aplica la migración dos veces ni duplica el historial.
- [ ] Los errores de Supabase se muestran en español y no exponen detalles internos.
- [ ] Editar campos limpia errores y el aviso, como en el SPEC 03.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.
- [ ] La consola no muestra errores de React ni de hidratación.
- [ ] Hay capturas de 1440×900 y 390×844 en `.playwright-mcp/`.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `SUPABASE_SECRET_KEY` se filtra al cliente | Solo en `admin.ts` con `import "server-only"`; revisar que no lleve prefijo `NEXT_PUBLIC_`. |
| Cualquiera con un código con formato válido puede registrarse | El código viaja en un enlace privado y es único; a futuro, tabla de códigos válidos. |
| Spam de registros sin rate limit | Aceptado en este spec; se puede añadir límite en el servidor después. |
| Usuario creado y login automático falla | Mensaje claro y ruta a `/login`; el usuario ya existe y puede entrar manualmente. |
| El trigger bloquea futuros usuarios creados sin metadata | Documentado; cualquier alta futura debe enviar `employee_code`, `full_name` y `area`. |
| Pruebas E2E crean usuarios reales | Usar correo y código desechables y borrarlos al final con la Admin API. |
| El código queda en el historial del navegador | No es un secreto de autenticación; se documenta y no se registra en logs. |
| El archivo local y la versión remota de la migración se desalinean | Renombrar el archivo con la versión devuelta por `apply_migration`/`list_migrations` y verificar el historial antes de commitear. |
| Alguien aplica SQL directo y salta el historial | Regla del spec: todo cambio de esquema se crea como migración y se aplica con `apply_migration`. |

---

## Prerrequisitos para implementar

1. Agregar `SUPABASE_SECRET_KEY` a `.env.local` (Dashboard → Settings → API Keys → secret key) y a Vercel.
2. Confirmar que se puede aplicar la migración directamente al proyecto `uvuwrtytwvfdfrpiveod`; hoy `public` está vacío.
3. Tener `npx supabase` disponible (se usa vía `npx`, sin instalación global) para generar la migración; el MCP ya está autenticado para aplicarla.
4. El repositorio debe incluir `supabase/config.toml` y `supabase/migrations/` en el commit; no se aceptan cambios de esquema aplicados solo desde el dashboard.

---

## Lo que **no** incluye este spec

- Login real, logout, recuperación de contraseña o rutas protegidas.
- Validación del código contra Google Sheets o tabla de códigos sembrada.
- Rate limiting, captcha o invitaciones de un solo uso.
- Edición o baja de empleados.
- Inicio de sesión automático persistente más allá del redirect a `/`.
- Pruebas automatizadas.
