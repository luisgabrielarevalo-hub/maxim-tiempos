import type { Metadata } from "next";

import DailyReportPage from "@/components/report/DailyReportPage";
import {
  getCurrentEmployee,
  requireSession,
} from "@/lib/supabase/session";

export const metadata: Metadata = {
  title: "Reporte diario de campo | Bitácora de personal",
  description:
    "Plantilla para reportar la jornada del día: en base, en pozo, en descanso o en licencia. Si fue en pozo, se piden el pozo y la actividad realizada.",
};

export default async function Home() {
  await requireSession();
  const employee = await getCurrentEmployee();

  return <DailyReportPage employee={employee} />;
}
