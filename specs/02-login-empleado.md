# SPEC 02 — Acceso del empleado

> **Estado:** Implementado
> **Depende de:** SPEC 01 (reporte diario de campo)
> **Fecha:** 2026-11-05
> **Objetivo:** Implementar en Next.js la pantalla `/login` a partir del prototipo `Referencias/login-empleado.html`, con formulario validado de correo electrónico y contraseña, sin backend ni sesión real.

---

## Por qué existe este spec

El SPEC 01 dejó login y registro fuera de alcance. La app ya tiene el sistema visual, las tipografías y los tokens oklch, así que esta pantalla debe reutilizarlos en lugar de duplicarlos.

El prototipo pide un "código de empleado", pero el usuario decidió cambiar ese campo por **correo electrónico** y validarlo como tal. El resto del comportamiento se mantiene: verificación simulada, aviso de resultado y sin navegación posterior.

---

## Alcance

**Incluye:**

- Ruta `/login` con la pantalla completa de acceso.
- Encabezado con cinta superior, título, nota y panel de credenciales.
- Campo de correo electrónico (`type="email"`) y campo de contraseña con botón Ver/Ocultar.
- Validación de correo vacío, formato inválido y contraseña vacía, con mensajes por campo y foco en el primer campo inválido.
- Estado de envío: botón deshabilitado con texto "Verificando…" durante una verificación simulada de 600 ms.
- Aviso de resultado con variantes `ok` / `mal` y `role="status"`.
- Pie de página "Plantilla de acceso · Uso interno del personal".
- Copy en español, identificadores en inglés y reutilización de `next/font/google` y de los tokens de `app/globals.css`.
- Actualización de `AGENTS.md` para que la regla de login hable de correo electrónico y no de código de empleado.
- Verificación con `npx tsc --noEmit`, `npm run lint`, `npm run build` y capturas de Playwright en `.playwright-mcp/`.

**Fuera de alcance (para specs futuros):**

- Backend, API, base de datos o autenticación real.
- Sesión, cookies, tokens, `localStorage` o redirección tras el acceso.
- Registro de empleados (`Referencias/registro-empleado.html`).
- Recuperación de contraseña.
- Opción "Mantener la sesión abierta".
- Enlaces desde `/` a `/login` o viceversa (no están en el prototipo).
- Modo oscuro, i18n o multiempresa.
- Pruebas automatizadas.

---

## Contrato de datos y validación

```ts
// lib/auth.ts

export interface LoginFormValues {
  email: string;
  password: string;
}

export type LoginField = "email" | "password";

export type LoginErrors = Partial<Record<LoginField, string>>;

export interface AuthResult {
  ok: boolean;
  message: string;
}

export const MAX_EMAIL_LENGTH = 254;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateLogin(values: LoginFormValues): LoginErrors;

/** Stub de demostración: siempre responde ok. Se sustituirá por la llamada real. */
export function authenticate(email: string, password: string): AuthResult;
```

Reglas:

| Campo      | Regla                                  | Mensaje                                         |
| ---------- | -------------------------------------- | ----------------------------------------------- |
| `email`    | Obligatorio                            | "Escribe tu correo electrónico."                |
| `email`    | Formato `usuario@dominio.tld`          | "Escribe un correo electrónico válido."         |
| `email`    | Máximo 254 caracteres                  | "Máximo 254 caracteres."                        |
| `password` | Obligatorio, sin recortar              | "Escribe tu contraseña."                        |

Convenciones:

- El correo se recorta con `trim()` antes de validar y de autenticar.
- La contraseña se usa tal cual se escribe; los espacios son válidos.
- La validación de correo es pragmática (no implementa RFC 5322).
- `authenticate` devuelve `{ ok: true, message: "Acceso correcto. Bienvenido(a)." }`.
- No se guarda, envía ni persiste ningún dato.

---

## Interfaz

Estructura tomada del prototipo:

1. Cinta superior de 10 px con `repeating-linear-gradient` en `--status-pozo`.
2. `header` con fondo `--primary`: kicker "Bitácora de personal · Acceso", `h1` "Ingreso del empleado" y nota "Ingresa con tu correo electrónico y contraseña para reportar tu jornada del día."
3. `main` centrado con ancho máximo de 640 px.
4. Panel con una sección "01 Credenciales" y el formulario.
5. Sección de aviso, renderizada **solo** cuando existe un mensaje (el prototipo deja una franja vacía; no se replica).
6. Pie "Plantilla de acceso · Uso interno del personal".

Campos:

- Correo: `type="email"`, `inputMode="email"`, `autoComplete="username"`, `maxLength={254}`, `spellCheck={false}`, `autoCapitalize="none"`, placeholder "nombre@empresa.com".
- Contraseña: `type` alterna entre `password` y `text`, `autoComplete="current-password"`, placeholder "Tu contraseña".
- Botón Ver/Ocultar: `type="button"`, `aria-pressed`, `aria-controls="login-password"`, texto "Ver" / "Ocultar".
- Botón de envío: ancho completo, tipografía display, "Ingresar" / "Verificando…".
- Se eliminan "Mantener la sesión abierta" y "¿Olvidaste tu contraseña?".

---

## Plan de implementación

1. **Dominio de acceso.** Crear `lib/auth.ts` con tipos, `MAX_EMAIL_LENGTH`, `EMAIL_PATTERN`, `validateLogin` y el stub `authenticate`. Prueba manual: `npx tsc --noEmit` compila.
2. **Ruta y shell.** Crear `app/login/page.tsx` como componente servidor con metadatos ("Acceso del empleado | Bitácora de personal") y `components/auth/LoginPage.tsx` con cinta, encabezado, panel y pie. Prueba manual: `/login` responde y `/` sigue mostrando el reporte diario.
3. **Formulario.** Crear `components/auth/LoginForm.tsx` como componente cliente con estado controlado de correo, contraseña, errores y aviso. Prueba manual: escribir en ambos campos actualiza el estado y el botón Ver/Ocultar alterna el tipo.
4. **Validación y foco.** Conectar `validateLogin`, pintar un mensaje por campo con `aria-invalid` y `aria-describedby`, y enfocar el primer campo inválido en el orden correo → contraseña. Prueba manual: enviar vacío marca ambos campos y enfoca correo; un correo inválido marca solo correo.
5. **Verificación simulada.** Al enviar válido, deshabilitar el botón, mostrar "Verificando…" y, tras 600 ms, publicar el aviso `ok`. Limpiar el temporizador al desmontar. Prueba manual: el botón no se puede pulsar dos veces y el aviso aparece una sola vez.
6. **Sincronización del aviso.** Al editar cualquier campo o alternar la visibilidad, descartar errores del campo y volver el aviso a oculto. Prueba manual: el aviso de éxito desaparece al escribir de nuevo.
7. **Accesibilidad.** Labels asociados por `htmlFor`/`id`, `role="status"` en el aviso, foco visible en inputs y botones, y sin controles decorativos con foco trampa. Prueba manual: recorrido completo con Tab y Enter.
8. **Documentación.** Actualizar en `AGENTS.md` la regla de login: correo electrónico con formato válido y contraseña no vacía; retirar la mención al código de 12 caracteres.
9. **Responsive y comparación visual.** Revisar 390×844 y 1440×900 contra `Referencias/login-empleado.html`, ajustando paddings de 24/32 px y el ancho de 640 px. Guardar capturas en `.playwright-mcp/`.
10. **Verificación final.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; corregir lo que falle y revisar la consola del navegador.

---

## Criterios de aceptación

- [x] `/login` responde y muestra la pantalla de acceso en español sin errores en consola.
- [x] `/` sigue mostrando el reporte diario sin cambios funcionales.
- [x] El encabezado muestra "Bitácora de personal · Acceso", "Ingreso del empleado" y la nota con correo electrónico.
- [x] El panel muestra la sección "01 Credenciales" con los campos de correo y contraseña.
- [x] El campo de correo es `type="email"`, usa `autoComplete="username"` y limita a 254 caracteres.
- [x] No existen los controles "Mantener la sesión abierta" ni "¿Olvidaste tu contraseña?".
- [x] Enviar vacío muestra "Escribe tu correo electrónico." y "Escribe tu contraseña.", enfoca el correo y no muestra aviso de éxito.
- [x] Un correo con formato inválido muestra "Escribe un correo electrónico válido." y no envía.
- [x] Un correo válido y contraseña no vacía pasan la validación.
- [x] Mientras verifica, el botón queda deshabilitado y su texto es "Verificando…".
- [x] Tras 600 ms aparece el aviso `ok` "Acceso correcto. Bienvenido(a)." con `role="status"`.
- [x] Editar cualquier campo u ocultar/mostrar la contraseña descarta el aviso y los errores del campo editado.
- [x] El botón Ver/Ocultar alterna el tipo de la contraseña sin perder el valor y actualiza `aria-pressed` y su texto.
- [x] El aviso no ocupa una franja vacía cuando no hay mensaje.
- [x] Los campos tienen label asociado, foco visible y errores conectados con `aria-describedby`.
- [x] La pantalla es usable a 390×844 y se ve alineada con el prototipo a 1440×900.
- [x] No hay redirección, cookie, `localStorage` ni llamada de red tras un acceso válido.
- [x] `AGENTS.md` describe el login con correo electrónico y ya no con código de 12 caracteres.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [x] La consola no muestra errores de React ni advertencias de hidratación.
- [x] Hay capturas de 1440×900 y 390×844 guardadas en `.playwright-mcp/`.

---

## Decisiones tomadas y descartadas

- **Sí:** ruta `/login`. Mantiene el reporte diario en `/` y usa una ruta en inglés, coherente con los identificadores del código.
- **Sí:** correo electrónico en lugar de código de empleado. Lo pidió el usuario; se valida formato y longitud.
- **Sí:** solo mostrar el aviso de éxito, sin redirección ni sesión. Es fiel al prototipo y evita inventar autenticación.
- **Sí:** eliminar "Mantener la sesión abierta" y "¿Olvidaste tu contraseña?". No tienen respaldo y el usuario prefirió no mostrarlos.
- **Sí:** verificación simulada de 600 ms. Conserva el estado de carga del prototipo y deja un punto claro para conectar el backend.
- **Sí:** reutilizar tokens, tipografías y convenciones del SPEC 01. Evita duplicar el sistema visual.
- **Sí:** renderizar la sección de aviso solo con mensaje. El prototipo deja una banda vacía que no aporta.
- **Sí:** actualizar `AGENTS.md`. La regla de dominio vigente quedaría obsoleta con el cambio a correo.
- **No:** backend, API o autenticación real. No existe todavía y el prototipo es explícitamente una plantilla.
- **No:** sesión persistente, cookies o `localStorage`. Se resolverá en un spec de autenticación.
- **No:** pantalla de registro o recuperación. Cada una tendrá su propio spec.
- **No:** librería de componentes ni nuevas dependencias. El prototipo y Tailwind cubren la pantalla.
- **No:** pruebas automatizadas. El proyecto no tiene suite configurada.

---

## Riesgos identificados

| Riesgo                                                        | Mitigación                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `setTimeout` actualiza estado tras desmontar                  | Guardar el id del temporizador en un `ref` y limpiarlo en el `useEffect` de desmontaje.          |
| El navegador autocompleta y dispara el aviso sin interacción  | No reaccionar a `change`; el aviso solo se calcula en el `submit`.                               |
| Doble envío mientras se verifica                              | Deshabilitar el botón y salir temprano si ya está en estado `loading`.                           |
| El campo de correo desborda el panel en móvil                 | `w-full`, `min-w-0` en el contenedor y probar a 390 px.                                          |
| La validación pragmática rechaza correos válidos raros        | Aceptar cualquier `usuario@dominio.tld` con TLD de 2+ caracteres; documentar el límite.          |
| El aviso verde/rojo no cumple contraste                       | Usar `--success` y `--destructive` con texto en negrita y comparar capturas.                     |
| Quitar el código de empleado rompe la regla documentada        | Actualizar `AGENTS.md` en el mismo cambio.                                                       |

---

## Lo que **no** incluye este spec

- Registro de empleados, recuperación de contraseña o cierre de sesión.
- Backend, API, base de datos, cookies o tokens.
- Redirección al reporte diario después del acceso.
- Persistencia de "recordarme" o de credenciales.
- Enlaces de navegación entre `/` y `/login`.
- Modo oscuro, i18n o multiempresa.
- Pruebas automatizadas.

Cada uno de esos puntos, si se implementa, va en su propio spec.

---

## Registro de verificación

**Fecha:** 2026-11-05
**Entorno:** Next.js 16.3.4 (Turbopack), React 19.2.8, dev server del repo en `http://localhost:3000`, Chromium vía Playwright.
**Alcance:** revisión estática de `lib/auth.ts`, `app/login/page.tsx`, `components/auth/LoginPage.tsx`, `components/auth/LoginForm.tsx`, `app/globals.css`, `app/layout.tsx`, `AGENTS.md`, más comprobación funcional en navegador.

### Comandos ejecutados

| Comando             | Resultado | Detalle                                                                 |
| ------------------- | --------- | ----------------------------------------------------------------------- |
| `npx tsc --noEmit`  | ✅ 0      | Sin salida ni errores.                                                  |
| `npm run lint`      | ✅ 0      | `eslint` sin hallazgos.                                                 |
| `npm run build`     | ✅ 0      | Compilación correcta; rutas estáticas `/`, `/_not-found` y `/login`.    |

### Criterios

| #  | Criterio                                                                 | Estado     | Evidencia                                                                                                                                                                                                 |
| -- | ------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | `/login` responde y se muestra en español sin errores                    | Verificado | HTTP 200; título "Acceso del empleado \| Bitácora de personal"; consola: 197 mensajes, 0 errores, 0 warnings.                                                                                             |
| 2  | `/` sigue mostrando el reporte diario                                    | Verificado | HTTP 200; `h1` "Reporte diario de campo"; `app/page.tsx` sin cambios.                                                                                                                                     |
| 3  | Encabezado con kicker, `h1` y nota de correo                             | Verificado | `components/auth/LoginPage.tsx:13-21`; snapshot de accesibilidad.                                                                                                                                         |
| 4  | Panel "01 Credenciales" con ambos campos                                 | Verificado | `components/auth/LoginPage.tsx:26-42`, `LoginForm.tsx:94-158`.                                                                                                                                             |
| 5  | Correo `type=email`, `autoComplete=username`, 254 caracteres             | Verificado | `LoginForm.tsx:102-107`; DOM: `type=email`, `autocomplete=username`, `maxLength=254`, `inputMode=email`, `spellcheck=false`.                                                                               |
| 6  | Sin "Mantener la sesión abierta" ni "¿Olvidaste tu contraseña?"           | Verificado | `grep` sin coincidencias; `body.innerText` no los contiene.                                                                                                                                               |
| 7  | Envío vacío: dos mensajes, foco en correo, sin aviso                      | Verificado | `LoginForm.tsx:68-78`; DOM: `activeId=login-email`, `aria-invalid=true` en ambos, errores exactos, `[role=status]` ausente.                                                                                |
| 8  | Correo inválido: mensaje y no envía                                      | Verificado | `lib/auth.ts:26-27`; con `abc` aparece "Escribe un correo electrónico válido.", botón no deshabilitado, sin aviso.                                                                                         |
| 9  | Correo válido + contraseña no vacía pasan                                | Verificado | `lib/auth.ts:18-35`; con `empleado@empresa.com` se inicia la verificación y llega el aviso `ok`.                                                                                                          |
| 10 | Loading: botón deshabilitado y "Verificando…"                            | Verificado | `LoginForm.tsx:80-89,160-166`; durante 300 ms: `disabled=true`, texto "Verificando…"; doble `requestSubmit()` produjo un solo aviso.                                                                      |
| 11 | Aviso `ok` a los 600 ms con `role="status"`                              | Verificado | `LoginForm.tsx:81-89,168-179`; a los 750 ms: "Acceso correcto. Bienvenido(a).", `role=status`, 1 solo nodo.                                                                                               |
| 12 | Editar campo o alternar visibilidad limpia aviso y errores del campo     | Verificado | `LoginForm.tsx:43-61,144-147`; tras editar el correo el aviso desaparece (0 nodos); editar correo limpia su error y conserva el de contraseña.                                                            |
| 13 | Ver/Ocultar alterna tipo, conserva valor, `aria-pressed` y texto         | Verificado | `LoginForm.tsx:131,140-151`; `password`→`text` con valor intacto, `aria-pressed=true`, texto "Ocultar"; y a la inversa.                                                                                   |
| 14 | Sin franja vacía de aviso                                                | Verificado | `LoginForm.tsx:168` renderiza el aviso solo si `notice` existe; DOM inicial: 0 nodos `[role=status]`.                                                                                                      |
| 15 | Labels, foco visible y `aria-describedby`                                | Verificado | `LoginForm.tsx:95-97,111-112,123-125,136-137`; Tab: correo → contraseña → Ver → Ingresar, con `box-shadow` de foco en cada control.                                                                        |
| 16 | Usable a 390×844 y alineada a 1440×900                                   | Verificado | 390×844: `scrollWidth=390`, sin overflow horizontal; capturas comparadas con `Referencias/login-empleado.html`.                                                                                           |
| 17 | Sin redirección, cookies, `localStorage` ni red tras acceso              | Verificado | `grep` sin `router.push`/`fetch`/`localStorage`/`document.cookie`; tras el acceso: URL `/login`, `cookie=""`, storage vacío; solo peticiones RSC de navegación.                                             |
| 18 | `AGENTS.md` con login por correo y sin código de 12 caracteres           | Verificado | `AGENTS.md:43` ("Login requires a valid email address and a non-empty password"); sin menciones a 12 caracteres.                                                                                          |
| 19 | `tsc`, `lint` y `build` sin errores                                      | Verificado | Ver tabla de comandos.                                                                                                                                                                                    |
| 20 | Consola sin errores de React ni warnings de hidratación                  | Verificado | 0 errores y 0 warnings en toda la sesión; solo logs de Fast Refresh/HMR y el aviso de React DevTools.                                                                                                     |
| 21 | Capturas 1440×900 y 390×844 en `.playwright-mcp/`                        | Verificado | `.playwright-mcp/login-1440x900.png`, `login-390x844.png`, `spec02-02…`, `spec02-03…`, `spec02-04…`, `spec02-05…`, `spec02-06…`.                                                                          |

### Capturas

- `.playwright-mcp/spec02-02-inicial-1440x900.png`
- `.playwright-mcp/spec02-03-errores-vacio-1440x900.png`
- `.playwright-mcp/spec02-04-aviso-ok-1440x900.png`
- `.playwright-mcp/spec02-05-mobile-390x844.png`
- `.playwright-mcp/spec02-06-mobile-aviso-390x844.png`
- `.playwright-mcp/spec02-07-home-1440x900.png`
- `.playwright-mcp/spec02-01-foco-teclado-1440x900.png`
- Referencia visual: `.playwright-mcp/prototype-login-1440x900.png`, `prototype-login-390x844.png`

### Observaciones menores (no bloquean)

1. El aviso `ok` usa `--status-descanso` (`LoginForm.tsx:173`) en lugar de un token `--success`. El valor oklch es idéntico al del prototipo (`0.56 0.11 165`) y `globals.css` no define `--success`, así que el resultado visual es correcto.
2. `AGENTS.md:13` conserva la frase "the Next.js app is still the untouched create-next-app starter", ya desactualizada tras SPEC 01 y SPEC 02. No afecta al criterio de login.
3. El aviso se renderiza dentro del `<form>` y no como sección independiente; cumple el criterio de no dejar franja vacía y queda junto al botón de envío.
