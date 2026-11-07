import type { Metadata } from "next";

import DailyReportPage from "@/components/report/DailyReportPage";
import { getTodayLocal, monthKey, parseLocalDate } from "@/lib/report";
import { loadEmployeeMonth } from "@/lib/sheets/month";
import { loadEmployeeRestDays } from "@/lib/sheets/rest-days";
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
  const serverToday = getTodayLocal();
  const todayDate = parseLocalDate(serverToday);
  const year = todayDate.getFullYear();
  const monthIndex = todayDate.getMonth();

  const [initial, restDays] = await Promise.all([
    employee
      ? loadEmployeeMonth(employee.employeeCode, year, monthIndex)
      : Promise.resolve({
          month: monthKey(year, monthIndex),
          reports: [],
          message: "No encontramos tu ficha de empleado.",
        }),
    employee
      ? loadEmployeeRestDays(employee.employeeCode, serverToday)
      : Promise.resolve({
          month: monthKey(year, monthIndex),
          restDays: null,
          message: null,
        }),
  ]);

  return (
    <DailyReportPage
      employee={employee}
      today={serverToday}
      initialMonth={{ year, monthIndex }}
      initialReports={initial.reports}
      initialMessage={initial.message}
      initialRestDays={restDays.restDays}
    />
  );
}
