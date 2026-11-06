import type { Metadata } from "next";

import RegisterForm from "@/components/auth/RegisterForm";
import RegisterPage from "@/components/auth/RegisterPage";
import { normalizeEmployeeCode } from "@/lib/auth";

export const metadata: Metadata = {
  title: { absolute: "Registro del empleado | Bitácora de personal" },
  description:
    "Plantilla de registro del empleado: datos personales, código alfanumérico de 5 caracteres y cuenta de acceso.",
};

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
