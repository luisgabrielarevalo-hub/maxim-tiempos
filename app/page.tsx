import type { Metadata } from "next";

import DailyReportPage from "@/components/report/DailyReportPage";
import { getTodayLocal, monthKey, parseLocalDate } from "@/lib/report";
import { loadEmployeeMonth } from "@/lib/sheets/month";
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
  const todayDate = parseLocalDate(getTodayLocal());
  const year = todayDate.getFullYear();
  const monthIndex = todayDate.getMonth();

  const initial = employee
    ? await loadEmployeeMonth(employee.employeeCode, year, monthIndex)
    : {
        month: monthKey(year, monthIndex),
        reports: [],
        message: "No encontramos tu ficha de empleado.",
      };

  return (
    <DailyReportPage
      employee={employee}
      initialMonth={{ year, monthIndex }}
      initialReports={initial.reports}
      initialMessage={initial.message}
    />
  );
}
