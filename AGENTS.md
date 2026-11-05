<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project guidance

See `../AGENTS.md` for layout, commands, Next.js 16 quirks, and domain rules. All commands run from this directory.

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
