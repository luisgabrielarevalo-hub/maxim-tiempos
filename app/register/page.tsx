import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";
import RegisterPage from "@/components/auth/RegisterPage";

export const metadata: Metadata = {
  title: { absolute: "Registro del empleado | Bitácora de personal" },
  description:
    "Plantilla de registro del empleado: datos personales, código alfanumérico de 5 caracteres y cuenta de acceso.",
};

export default function RegisterRoute() {
  return (
    <RegisterPage>
      <RegisterForm />
    </RegisterPage>
  );
}
