import type { Metadata } from "next";
import { redirect } from "next/navigation";

import RegisterForm from "@/components/auth/RegisterForm";
import RegisterPage from "@/components/auth/RegisterPage";
import { normalizeEmployeeCode } from "@/lib/auth";
import { getSessionClaims } from "@/lib/supabase/session";

export const metadata: Metadata = {
  title: { absolute: "Registro del empleado | Bitácora de personal" },
  description:
    "Plantilla de registro del empleado: datos personales, código alfanumérico de 5 caracteres y cuenta de acceso.",
};

export default async function RegisterRoute(props: PageProps<"/register">) {
  // Con sesión no hay registro: el proxy ya redirige, esto es defensa en profundidad.
  const claims = await getSessionClaims();
  if (claims?.sub) redirect("/");

  const params = await props.searchParams;
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = normalizeEmployeeCode(raw ?? "");

  return (
    <RegisterPage>
      <RegisterForm initialCode={code} hasCodeParam={Boolean(raw)} />
    </RegisterPage>
  );
}
