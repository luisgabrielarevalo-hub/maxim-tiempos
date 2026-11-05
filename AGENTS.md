# Proyecto Tiempos Maxim

Spanish-language employee time/field-report app ("Bitácora de personal"). The product is defined by the three standalone HTML prototypes in `Referencias/`; the Next.js app is still the untouched `create-next-app` starter and has not implemented them yet.

## Layout

- `maxim-tiempos/` — Next.js 16.3.4 App Router app (React 19, TypeScript, Tailwind v4). This is the git repo; the parent folder is not.
- `Referencias/` — design/reference prototypes (`login-empleado.html`, `registro-empleado.html`, `reporte-diario-campo.html`). Plain HTML/CSS/JS, not built or imported. Port behavior and styles from here; do not add them to the app as-is.

Run all commands from `maxim-tiempos/`.

## Commands

- `npm run dev` — dev server on :3000. It rewrites the `nextjs-agent-rules` block in `maxim-tiempos/AGENTS.md`; keep that block.
- `npm run lint` — runs `eslint` directly (Next 16 removed `next lint`).
- `npx tsc --noEmit` — typecheck; there is no `typecheck` script.
- `npm run build` / `npm start`.
- No test suite, CI, or formatter is configured. Do not invent test commands.

## Next.js 16 quirks

- Read `maxim-tiempos/node_modules/next/dist/docs/` before writing Next code; this version differs from training data.
- Route props use generated global types such as `LayoutProps<"/">`, not hand-written prop interfaces.
- Tailwind v4: no `tailwind.config`; design tokens live in `app/globals.css` under `@theme inline`.
- `@/*` maps to the `maxim-tiempos` root (there is no `src/` directory).

## Domain rules from the prototypes

- UI copy is Spanish (`lang="es"`); keep it that way.
- Day status is one of `base | pozo | descanso | licencia`. Selecting `pozo` reveals required `pozo` (max 60 chars) and `actividad` (max 500).
- `observaciones` (max 300) is required for `base` and `pozo`, optional for `descanso` and `licencia`.
- Dates are local `YYYY-MM-DD` strings; future dates are rejected. Calendar weeks start Monday.
- Employee code: exactly 5 chars, uppercase letters and digits, must contain both; password min 8 chars.
- Visual system: Bebas Neue (display), Barlow (sans), IBM Plex Mono (mono); oklch CSS variables including `--status-*` colors; reports have a print stylesheet.

The prototypes keep data in memory only and stub `validarCredenciales` / `guardarEmpleado`; there is no backend or persistence yet.


## MCPs

- Playwright screenshots y cualquier cosa relacionada a Playwright tienen que
estar en la carpeta .playwright-mcp.

- Context7 Usaremos este MCP para traer la información actualizada del
framework.


## Spec Driven Development

- /spec Usaremos estabilidad para crear las especificaciones.

- /spec-impl Usaremos esta habilidad para implementar las especificaciones.


## Reglas de código

- Usar código limpio, nombres, funciones y variables en inglés

