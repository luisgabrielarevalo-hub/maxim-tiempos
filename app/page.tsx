import type { Metadata } from "next";
import DailyReportPage from "@/components/report/DailyReportPage";

export const metadata: Metadata = {
  title: "Reporte diario de campo | Bitácora de personal",
  description:
    "Plantilla para reportar la jornada del día: en base, en pozo, en descanso o en licencia. Si fue en pozo, se piden el pozo y la actividad realizada.",
};

export default function Home() {
  return <DailyReportPage />;
}
