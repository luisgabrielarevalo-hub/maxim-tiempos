import type { Metadata } from "next";

import LoginForm from "@/components/auth/LoginForm";
import LoginPage from "@/components/auth/LoginPage";
import { resolveRedirectPath } from "@/lib/auth";

export const metadata: Metadata = {
  title: { absolute: "Acceso del empleado | Bitácora de personal" },
  description:
    "Plantilla de acceso para el personal: correo electrónico y contraseña. Ingresa para reportar la jornada del día.",
};

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
