import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";
import LoginPage from "@/components/auth/LoginPage";

export const metadata: Metadata = {
  title: { absolute: "Acceso del empleado | Bitácora de personal" },
  description:
    "Plantilla de acceso para el personal: correo electrónico y contraseña. Ingresa para reportar la jornada del día.",
};

export default function LoginRoute() {
  return (
    <LoginPage>
      <LoginForm />
    </LoginPage>
  );
}
