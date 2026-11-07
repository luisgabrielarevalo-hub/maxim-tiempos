import { unstable_rethrow } from "next/navigation";

/**
 * `redirect()` y `notFound()` interrumpen el flujo con un error propio de
 * Next. Una Server Action que redirige rechaza su promesa con ese error
 * aunque la navegación ya esté en curso, así que no es un fallo que debamos
 * mostrar al empleado.
 */
export function isNextFlowError(error: unknown): boolean {
  try {
    unstable_rethrow(error);
    return false;
  } catch {
    return true;
  }
}
