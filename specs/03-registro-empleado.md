# SPEC 03 — Registro del empleado

> **Estado:** Aprobado
> **Depende de:** SPEC 02 (acceso del empleado), SPEC 01 (sistema visual)
> **Fecha:** 2026-11-05
> **Objetivo:** Implementar en Next.js la pantalla `/register` a partir del prototipo `Referencias/registro-empleado.html`, con datos personales, código alfanumérico de 5 caracteres y cuenta de acceso, todo validado, sin backend ni persistencia.

---

## Por qué existe este spec

El SPEC 02 dejó el registro explícitamente fuera de alcance y `AGENTS.md` todavía dice que la pantalla no está implementada. La app ya tiene las rutas, las tipografías y los tokens oklch, así que esta pantalla debe reutilizarlos en lugar de duplicarlos.

El prototipo tiene el HTML incompleto: su script referencia `generar`, `segundos`, `contar`, `regla-*` y `acepto`, elementos que ya no existen en el markup, y por eso lanza un error al cargar. El usuario decidió **no** reconstruir esas piezas: el bloque de código queda como un único campo y no hay casilla de aceptación. Este spec define el comportamiento real de lo que sí se va a implementar y deja constancia de lo descartado.

También se decidió que **todos los campos son obligatorios**, incluido el cargo, que el prototipo no validaba.

---

## Alcance

**Incluye:**

- Ruta `/register` con la pantalla completa de registro.
- Cinta superior, encabezado y panel de cuatro secciones, sin pie de página.
- Campos: nombre completo, correo electrónico, cargo, código de empleado, contraseña y confirmación.
- Normalización del código en vivo: mayúsculas, solo `A-Z`/`0-9`, máximo 5 caracteres.
- Validación de todos los campos, mensajes por campo, `aria-invalid`, `aria-describedby` y foco en el primer campo inválido.
- Botón Ver/Ocultar independiente para cada contraseña.
- Estado de envío: botón deshabilitado con texto "Registrando…" durante un registro simulado de 600 ms.
- Aviso de resultado con variantes `ok` / `mal` y `role="status"`.
- Copy en español, identificadores en inglés y reutilización de `next/font/google`, de `lib/auth.ts` y de los tokens de `app/globals.css`.
- Actualización de `AGENTS.md`: la pantalla de registro ya existe y su regla de validación cambia.
- Verificación con `npx tsc --noEmit`, `npm run lint`, `npm run build` y capturas de Playwright en `.playwright-mcp/`.

**Fuera de alcance (para specs futuros):**

- Backend, API, base de datos o autenticación real.
- Persistencia del empleado, sesión, cookies, tokens o redirección.
- Inicio de sesión automático después del registro.
- Casilla de aceptación de términos o aviso de privacidad.
- Contador `n/5`, barras de progreso, lista de reglas y botón "Generar" del bloque de código.
- Ficha resumen del empleado registrado.
- Pie de página.
- Enlaces de navegación entre `/`, `/login` y `/register`.
- Recuperación de contraseña, edición o baja de empleados.
- Modo oscuro, i18n o multiempresa.
- Pruebas automatizadas.

---

## Contrato de datos y validación

Se extiende `lib/auth.ts`, que ya contiene `MAX_EMAIL_LENGTH`, `EMAIL_PATTERN`, `AuthResult` y `validateLogin`.

```ts
// lib/auth.ts

export interface RegisterFormValues {
  fullName: string;
  email: string;
  area: string;
  code: string;
  password: string;
  passwordConfirmation: string;
}

export interface EmployeeSummary {
  fullName: string;
  email: string;
  area: string;
  code: string;
}

export type RegisterField =
  | "fullName"
  | "email"
  | "area"
  | "code"
  | "password"
  | "passwordConfirmation";

export type RegisterErrors = Partial<Record<RegisterField, string>>;

export const MAX_FULL_NAME_LENGTH = 120;
export const MAX_AREA_LENGTH = 80;
export const MIN_PASSWORD_LENGTH = 8;
export const EMPLOYEE_CODE_LENGTH = 5;
export const EMPLOYEE_CODE_PATTERN = /^[A-Z0-9]{5}$/;
export const EMPLOYEE_CODE_ALLOWED = /^[A-Z0-9]+$/;
export const EMPLOYEE_CODE_HAS_LETTER = /[A-Z]/;
export const EMPLOYEE_CODE_HAS_DIGIT = /[0-9]/;

/** Pasa a mayúsculas, quita lo que no sea A-Z/0-9 y recorta a 5. */
export function normalizeEmployeeCode(value: string): string;

export function validateRegistration(values: RegisterFormValues): RegisterErrors;

/** Stub de demostración: siempre responde ok. Se sustituirá por el guardado real. */
export function registerEmployee(employee: EmployeeSummary): AuthResult;
```

Reglas:

| Campo                  | Regla                                    | Mensaje                                        |
| ---------------------- | ---------------------------------------- | ---------------------------------------------- |
| `fullName`             | Obligatorio                              | "Escribe el nombre completo."                  |
| `fullName`             | Máximo 120 caracteres                    | "Máximo 120 caracteres."                       |
| `email`                | Obligatorio                              | "Escribe tu correo electrónico."               |
| `email`                | Formato `usuario@dominio.tld`            | "Escribe un correo electrónico válido."        |
| `email`                | Máximo 254 caracteres                    | "Máximo 254 caracteres."                       |
| `area`                 | Obligatorio                              | "Escribe el cargo."                            |
| `area`                 | Máximo 80 caracteres                     | "Máximo 80 caracteres."                        |
| `code`                 | Obligatorio                              | "Escribe el código de 5 caracteres."           |
| `code`                 | Exactamente 5 caracteres                 | "El código debe tener 5 caracteres."           |
| `code`                 | Solo `A-Z` y `0-9`                       | "El código solo admite letras y números."      |
| `code`                 | Al menos una letra y un dígito           | "El código debe mezclar letras y números."     |
| `password`             | Obligatorio                              | "Escribe una contraseña."                      |
| `password`             | Mínimo 8 caracteres                      | "La contraseña debe tener 8 caracteres o más." |
| `passwordConfirmation` | Obligatorio                              | "Confirma la contraseña."                      |
| `passwordConfirmation` | Debe coincidir con `password`            | "Las contraseñas no coinciden."                |

Convenciones:

- `fullName`, `email` y `area` se recortan con `trim()` antes de validar y de enviar.
- El correo reutiliza `EMAIL_PATTERN` y `MAX_EMAIL_LENGTH` del SPEC 02; la validación es pragmática, no RFC 5322.
- El código se normaliza en cada cambio con `normalizeEmployeeCode`, y además se revalida en el submit por si el valor llegó pegado o por autocompletado.
- Las contraseñas se usan tal cual se escriben; los espacios son válidos. No se recortan.
- El orden de validación y de foco es: nombre → correo → cargo → código → contraseña → confirmación.
- `registerEmployee` devuelve `{ ok: true, message: "Empleado registrado correctamente." }` e ignora los datos recibidos.
- No se guarda, envía ni persiste ningún dato; la contraseña no forma parte de `EmployeeSummary`.
- El mensaje general de error es "Revisa los campos marcados."

---

## Interfaz

Estructura tomada del prototipo:

1. Cinta superior de 10 px con `repeating-linear-gradient` en `--status-pozo`.
2. `header` con fondo `--primary`: kicker "Bitácora de personal · Registro" y `h1` "Registro del empleado". Sin nota: el prototipo la eliminó.
3. `main` centrado con ancho máximo de 680 px.
4. Panel con secciones numeradas:
   - "01 Datos del empleado": nombre, correo y cargo en grilla de una columna en móvil y dos desde 640 px.
   - "02 Código de empleado": bloque destacado con borde y fondo mezclados con `--status-pozo`, label "Código alfanumérico de 5 caracteres" y un único input.
   - "03 Cuenta de acceso": contraseña y confirmación, cada una con su botón Ver/Ocultar.
   - Sección final sin número: botón de envío y aviso.
5. Sin pie de página: el prototipo no lo incluye y el usuario decidió no agregarlo.

Campos:

- Nombre: `type="text"`, `autoComplete="name"`, `maxLength={120}`, placeholder "Ej. María Fernanda López".
- Correo: `type="email"`, `inputMode="email"`, `autoComplete="email"`, `maxLength={254}`, `spellCheck={false}`, `autoCapitalize="none"`, placeholder "Ej. mlopez@empresa.com".
- Cargo: `type="text"`, `autoComplete="organization-title"`, `maxLength={80}`, placeholder "Ej. Operaciones de pozo".
- Código: `type="text"`, `inputMode="text"`, `autoComplete="off"`, `spellCheck={false}`, `autoCapitalize="characters"`, `maxLength={5}`, placeholder "AB12C", tipografía mono de 24 px, mayúsculas, `tracking` amplio y ancho de 190 px.
- Contraseña: `type` alterna entre `password` y `text`, `autoComplete="new-password"`, placeholder "Mínimo 8 caracteres".
- Confirmación: igual que la contraseña, placeholder "Repite la contraseña".
- Botones Ver/Ocultar: `type="button"`, `aria-pressed`, `aria-controls` al input correspondiente, texto "Ver" / "Ocultar".
- Botón de envío: ancho completo y tipografía display, "Registrar empleado" / "Registrando…".

Aviso:

- El aviso se renderiza **solo** cuando existe un mensaje; variantes `ok` (borde y texto `--success`) y `mal` (`--destructive`).
- Editar cualquier campo, alternar la visibilidad de una contraseña o reenviar oculta el aviso.

No se incluyen:

- Contador `n/5`, barras de progreso, lista de reglas ni botón "Generar".
- Casilla de aceptación de términos.
- Ficha resumen del empleado registrado.
- Pie de página.
- Enlaces a `/login` o `/`.

---

## Plan de implementación

1. **Dominio de registro.** Extender `lib/auth.ts` con `RegisterFormValues`, `EmployeeSummary`, `RegisterField`, `RegisterErrors`, las constantes, `normalizeEmployeeCode`, `validateRegistration` y el stub `registerEmployee`. Prueba manual: `npx tsc --noEmit` compila.
2. **Ruta y shell.** Crear `app/register/page.tsx` como componente servidor con metadatos ("Registro del empleado | Bitácora de personal") y `components/auth/RegisterPage.tsx` con cinta, encabezado y panel, sin pie de página. Prueba manual: `/register` responde y `/` y `/login` siguen funcionando.
3. **Formulario base.** Crear `components/auth/RegisterForm.tsx` como componente cliente con estado controlado de los seis campos, errores y aviso. Prueba manual: escribir en cada campo actualiza el estado.
4. **Normalización del código.** Conectar `normalizeEmployeeCode` al `onChange`, aceptar pegado de minúsculas o caracteres inválidos y limitar a 5. Prueba manual: `ab-12c!` queda en `AB12C`.
5. **Visibilidad de contraseñas.** Implementar dos toggles independientes que conservan el valor y actualizan `aria-pressed`, `aria-controls` y el texto. Prueba manual: alternar una contraseña no afecta a la otra.
6. **Validación y foco.** Conectar `validateRegistration`, pintar un mensaje por campo y enfocar el primero inválido en el orden definido. Prueba manual: enviar vacío marca los seis campos y enfoca nombre; un código `ABCDE` marca solo el código con el mensaje de mezcla.
7. **Registro simulado.** Al enviar válido, deshabilitar el botón, mostrar "Registrando…" y, tras 600 ms, publicar el aviso `ok`. Guardar el id del temporizador en un `ref` y limpiarlo al desmontar; ignorar envíos mientras `isLoading`. Prueba manual: doble envío produce un solo aviso.
8. **Sincronización.** Al editar cualquier campo o alternar visibilidad, borrar el error de ese campo y ocultar el aviso. Prueba manual: el aviso desaparece al cambiar el correo.
9. **Accesibilidad.** Labels por `htmlFor`/`id`, errores con `aria-describedby`, `role="status"` en el aviso, foco visible y recorrido completo con Tab/Enter. Prueba manual: el orden de tabulación sigue el orden visual.
10. **Documentación.** Actualizar `AGENTS.md`: registro implementado en `/register`, todos los campos obligatorios, código de 5 caracteres con letra y dígito, contraseña de 8+ y confirmación, sin casilla de aceptación ni controles de código descartados.
11. **Responsive y comparación visual.** Revisar 390×844 y 1440×900 contra `Referencias/registro-empleado.html`, ajustar paddings de 24/32 px y el ancho de 680 px, y guardar capturas en `.playwright-mcp/`.
12. **Verificación final.** Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build`; corregir lo que falle y revisar la consola del navegador.

---

## Criterios de aceptación

- [ ] `/register` responde y muestra la pantalla de registro en español sin errores en consola.
- [ ] `/` y `/login` siguen funcionando sin cambios funcionales.
- [ ] El encabezado muestra "Bitácora de personal · Registro" y "Registro del empleado", sin nota.
- [ ] El panel muestra las secciones 01 Datos del empleado, 02 Código de empleado y 03 Cuenta de acceso.
- [ ] No hay pie de página.
- [ ] El bloque de código **no** muestra contador, barras, lista de reglas ni botón "Generar".
- [ ] El código se normaliza a mayúsculas, descarta caracteres inválidos y se limita a 5.
- [ ] No existe casilla de aceptación ni enlaces a `/login` o `/`.
- [ ] Enviar vacío muestra los seis mensajes, enfoca el nombre y no genera aviso de éxito.
- [ ] Un correo inválido muestra "Escribe un correo electrónico válido." y no envía.
- [ ] El nombre limita a 120 caracteres y el cargo a 80, con `maxLength` y validación de respaldo.
- [ ] Un cargo vacío muestra "Escribe el cargo." y no envía.
- [ ] Un código `ABCDE` muestra "El código debe mezclar letras y números.".
- [ ] Un código `12345` muestra "El código debe mezclar letras y números.".
- [ ] Un código `AB12` muestra "El código debe tener 5 caracteres.".
- [ ] Una contraseña de 7 caracteres muestra "La contraseña debe tener 8 caracteres o más.".
- [ ] Una confirmación distinta muestra "Las contraseñas no coinciden.".
- [ ] Un formulario válido pasa la validación y produce un solo envío.
- [ ] Mientras registra, el botón queda deshabilitado y su texto es "Registrando…".
- [ ] Tras 600 ms aparece el aviso `ok` "Empleado registrado correctamente." con `role="status"`.
- [ ] Editar cualquier campo u ocultar/mostrar una contraseña oculta el aviso y limpia el error del campo editado.
- [ ] Los dos botones Ver/Ocultar funcionan de forma independiente y actualizan `aria-pressed` y `aria-controls`.
- [ ] Los errores están conectados con `aria-describedby` y el foco es visible en todos los controles.
- [ ] La pantalla es usable a 390×844 sin desbordamiento horizontal y se ve alineada con el prototipo a 1440×900.
- [ ] No hay redirección, cookie, `localStorage` ni llamada de red tras un registro válido.
- [ ] `AGENTS.md` describe el registro implementado en `/register` con todos los campos obligatorios.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] La consola no muestra errores de React ni advertencias de hidratación.
- [ ] Hay capturas de 1440×900 y 390×844 guardadas en `.playwright-mcp/`.

---

## Decisiones tomadas y descartadas

- **Sí:** ruta `/register`. Coherente con `/login` y con los identificadores en inglés.
- **Sí:** todos los campos obligatorios, incluido el cargo. Lo pidió el usuario; el prototipo no validaba `area`.
- **Sí:** mantener el código de empleado en el registro. Es un dato distinto del correo de acceso y `AGENTS.md` ya lo documenta.
- **Sí:** solo el input en el bloque de código. El usuario descartó contador, barras, reglas y generador.
- **Sí:** sin casilla de aceptación. El usuario descartó el control `acepto` que el script todavía referencia.
- **Sí:** sin enlaces entre pantallas. El prototipo no los tiene y el SPEC 02 fijó la misma regla.
- **Sí:** solo el aviso de éxito, sin redirección ni sesión. Es fiel al prototipo y evita inventar autenticación.
- **Sí:** reutilizar `lib/auth.ts` y los patrones de `LoginForm.tsx`. Evita duplicar validación de correo y estilos.
- **Sí:** límites de 120 y 80 caracteres para nombre y cargo. Evitan textos desmedidos; el prototipo no los definía.
- **Sí:** actualizar `AGENTS.md`. Hoy afirma que el registro no está implementado y describe reglas incompletas.
- **No:** ficha resumen. El usuario decidió no mostrarla después del registro.
- **No:** pie de página. El markup del prototipo no lo incluye y el usuario prefirió no agregarlo.
- **No:** backend, API o autenticación real. No existe todavía y el prototipo es explícitamente una plantilla.
- **No:** persistencia, sesión, cookies o `localStorage`. Se resolverá en un spec de autenticación.
- **No:** reconstruir las piezas perdidas del prototipo (`generar`, `segundos`, `contar`, `regla-*`, `acepto`). Fueron descartadas por el usuario.
- **No:** librería de componentes ni nuevas dependencias. Tailwind y el sistema visual existente cubren la pantalla.
- **No:** pruebas automatizadas. El proyecto no tiene suite configurada.

---

## Riesgos identificados

| Riesgo                                                          | Mitigación                                                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| El script del prototipo falla y no sirve como referencia         | Implementar solo lo definido en este spec y verificar con el DOM real.                          |
| `setTimeout` actualiza estado tras desmontar                     | Guardar el id en un `ref` y limpiarlo en el `useEffect` de desmontaje.                          |
| Doble envío mientras se registra                                 | Deshabilitar el botón y salir temprano si ya está en estado `loading`.                          |
| Pegar un código con minúsculas, espacios o guiones               | Normalizar en cada `onChange` con `normalizeEmployeeCode` y revalidar en el submit.             |
| El input de código de 190 px desborda en móvil                   | `max-w-full` y probar a 390 px.                                                                 |
| Los límites de nombre y cargo no están en el prototipo           | Documentarlos como decisión y mostrar el mensaje solo si el valor llega por autocompletado.    |
| El aviso verde/rojo no cumple contraste                          | Usar `--success` y `--destructive` con texto en negrita y comparar capturas.                    |
| `AGENTS.md` queda desactualizado                                 | Actualizarlo en el mismo cambio, incluida la frase de "registro no implementado".               |

---

## Lo que **no** incluye este spec

- Backend, API, base de datos o autenticación real.
- Persistencia del empleado, sesión, cookies o tokens.
- Inicio de sesión automático o redirección tras el registro.
- Casilla de aceptación, términos o aviso de privacidad.
- Contador, barras de progreso, lista de reglas o generador de código.
- Ficha resumen del empleado registrado.
- Pie de página.
- Enlaces de navegación entre `/`, `/login` y `/register`.
- Recuperación de contraseña, edición o baja de empleados.
- Modo oscuro, i18n o multiempresa.
- Pruebas automatizadas.

Cada uno de esos puntos, si se implementa, va en su propio spec.
