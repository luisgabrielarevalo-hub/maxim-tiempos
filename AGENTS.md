<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Proyecto Tiempos Maxim

Spanish-language employee time/field-report app ("Bitácora de personal"). The product is defined by the three standalone HTML prototypes in `Referencias/`. The Next.js app implements the daily field report at `/` (SPEC 01), the employee login at `/login` (SPEC 02) and the employee registration at `/register` (SPEC 03), which persists accounts in Supabase (SPEC 04).

## Layout

- `app/` — App Router entrypoints (`layout.tsx`, `page.tsx`, `globals.css`, `login/page.tsx`, `register/page.tsx`, `register/actions.ts`). `@/*` maps to the repo root; there is no `src/`.
- `components/` — React components, grouped by domain (`components/auth/` holds the login and registration screens and forms).
- `lib/` — framework-agnostic domain logic (`lib/auth.ts` holds login and registration validation plus the `authenticate` stub) and Supabase clients (`lib/supabase/admin.ts`, `server.ts`, `proxy.ts`, `env.ts`).
- `supabase/` — `config.toml` and versioned SQL migrations. The remote schema is applied from these migrations, not from the dashboard.
- `proxy.ts` — Next 16 proxy (replaces `middleware.ts`); refreshes the Supabase session on every request.
- `Referencias/` — design/reference prototypes (`login-empleado.html`, `registro-empleado.html`, `reporte-diario-campo.html`). Plain HTML/CSS/JS, not built or imported. Port behavior and styles from here; do not add them to the app as-is.
- `CLAUDE.md` is only `@AGENTS.md`; keep this file as the single source of instructions.

## Commands

Run from the repo root.

- `npm run dev` — dev server on :3000. `next dev` adds the managed `nextjs-agent-rules` block above when it is missing; keep it and commit it with your work.
- `npm run lint` — runs `eslint` directly (Next 16 removed `next lint`).
- `npx tsc --noEmit` — typecheck; there is no `typecheck` script.
- `npm run build` / `npm start`.
- No test suite, CI, or formatter is configured. Do not invent test commands.

## Next.js 16 quirks

- Read `node_modules/next/dist/docs/` before writing Next code; this version differs from training data.
- Route props use generated global types such as `LayoutProps<"/">`, not hand-written prop interfaces.
- Tailwind v4: no `tailwind.config`; design tokens live in `app/globals.css` under `@theme inline`.
- `middleware.ts` is deprecated: session refresh lives in the root `proxy.ts` (Next 16 renamed the convention).

## Supabase

- Project `uvuwrtytwvfdfrpiveod`. Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (client-safe) and `SUPABASE_SECRET_KEY` (server only; never prefix it with `NEXT_PUBLIC_`). `.env.local` and Vercel need all three.
- Registration (`/register?code=XXXXX`): the page reads and normalizes the code from `searchParams`, shows it read-only and calls `registerEmployeeAction` (`app/register/actions.ts`). The action validates server-side, checks duplicates in `public.employees`, creates the user with the Admin API (`email_confirm: true`, metadata `employee_code`, `full_name`, `cargo`), signs in with cookies and redirects to `/`.
- Profile data lives in `public.employees` (1:1 with `auth.users`), filled by the `private.handle_new_employee()` trigger in the same transaction. RLS: authenticated users only read their own row; `anon` reads nothing. Only the secret key writes (it bypasses RLS).
- Schema changes are versioned in `supabase/migrations/`: create with `npx supabase migration new <name>`, apply with the Supabase MCP `apply_migration`, then rename the local file to the version returned by `list_migrations`. Never edit an applied migration and never apply schema changes only from the dashboard.
- `proxy.ts` refreshes the session (`updateSession` → `getClaims`); it does **not** protect routes. Real login and protected routes belong to SPEC 05.

## Domain rules from the prototypes

- UI copy is Spanish (`lang="es"`); keep it that way. Code identifiers (functions, variables) are English.
- Day status is one of `base | pozo | descanso | licencia`. Selecting `pozo` reveals required `pozo` (max 60 chars) and `actividad` (max 500).
- `observaciones` (max 300) is required for `base`, optional for `pozo`, `descanso` and `licencia`.
- Dates are local `YYYY-MM-DD` strings; future dates are rejected. Calendar weeks start Monday.
- Registration (`/register?code=...`): the employee code comes from the link, is normalized to uppercase `A-Z`/`0-9`, shown read-only and must be exactly 5 chars with both a letter and a digit; a missing or invalid `code` blocks submission. All fields are required — full name (max 120), email (max 254), cargo (max 80), password and confirmation. Password min 8 chars and confirmation must match; email format is validated. There is no acceptance checkbox, code counter/bars/rules/generator, summary card or footer. Login requires a valid email address and a non-empty password.
- Visual system: Bebas Neue (display), Barlow (sans), IBM Plex Mono (mono); oklch CSS variables including `--status-*` colors; reports have a print stylesheet.
- `registro-empleado.html` references elements that no longer exist (`generar`, `segundos`, `contar`, `regla-*`, `acepto`), so its script throws on load. Treat it as a visual reference, not a working implementation.
- The prototypes keep data in memory only and stub `validarCredenciales` / `guardarEmpleado`; the app mirrors login with the `authenticate` stub (SPEC 05 pending) and registration with the real `registerEmployeeAction` (Supabase).

## Tooling conventions

- Playwright screenshots and other Playwright artifacts go in `.playwright-mcp/`.
- Use Context7 MCP for up-to-date framework and library documentation.
- Spec-driven work: `/spec` creates specifications (using Estabilidad); `/spec-impl` implements them.

## MCPs

- Playwright screenshots y cualquier cosa relacionada a Playwright tienen que
estar en la carpeta .playwright-mcp

- Context7 Usaremos este MCP para traer la información actualizada del
framework.

## Reglas de código

- Usar código limpio, nombres, funciones y variables en inglés
