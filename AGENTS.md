<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Proyecto Tiempos Maxim

Spanish-language employee time/field-report app ("Bitácora de personal"). The product is defined by the three standalone HTML prototypes in `Referencias/`; the Next.js app is still the untouched `create-next-app` starter and has not implemented them.

## Layout

- `app/` — App Router entrypoints (`layout.tsx`, `page.tsx`, `globals.css`). `@/*` maps to the repo root; there is no `src/`.
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

## Domain rules from the prototypes

- UI copy is Spanish (`lang="es"`); keep it that way. Code identifiers (functions, variables) are English.
- Day status is one of `base | pozo | descanso | licencia`. Selecting `pozo` reveals required `pozo` (max 60 chars) and `actividad` (max 500).
- `observaciones` (max 300) is required for `base`, optional for `pozo`, `descanso` and `licencia`.
- Dates are local `YYYY-MM-DD` strings; future dates are rejected. Calendar weeks start Monday.
- Registration: employee code is exactly 5 chars, uppercase `A-Z`/`0-9`, and must contain both a letter and a digit; password min 8 chars and confirmation must match; email format is validated. Login only requires a non-empty code (max 12) and password.
- Visual system: Bebas Neue (display), Barlow (sans), IBM Plex Mono (mono); oklch CSS variables including `--status-*` colors; reports have a print stylesheet.
- `registro-empleado.html` references elements that no longer exist (`generar`, `segundos`, `contar`, `regla-*`, `acepto`), so its script throws on load. Treat it as a visual reference, not a working implementation.
- The prototypes keep data in memory only and stub `validarCredenciales` / `guardarEmpleado`; there is no backend or persistence yet.

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
