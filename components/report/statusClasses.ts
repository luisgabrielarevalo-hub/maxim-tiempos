import type { DayStatus } from "@/lib/report";

export const STATUS_DOT_CLASS: Record<DayStatus, string> = {
  base: "bg-status-base",
  pozo: "bg-status-pozo",
  descanso: "bg-status-descanso",
  licencia: "bg-status-licencia",
};
