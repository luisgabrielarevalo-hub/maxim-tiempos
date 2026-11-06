"use server";

import { getCurrentEmployee } from "@/lib/supabase/session";
import { loadEmployeeMonth, type MonthReports } from "@/lib/sheets/month";
import { monthKey } from "@/lib/report";

const INVALID_MONTH = "Mes no válido.";
const NO_EMPLOYEE = "No encontramos tu ficha de empleado.";

export async function loadMonthReportsAction(
  year: number,
  monthIndex: number,
): Promise<MonthReports> {
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return { month: "", reports: [], message: INVALID_MONTH };
  }

  const employee = await getCurrentEmployee();

  if (!employee) {
    return {
      month: monthKey(year, monthIndex),
      reports: [],
      message: NO_EMPLOYEE,
    };
  }

  return loadEmployeeMonth(employee.employeeCode, year, monthIndex);
}
