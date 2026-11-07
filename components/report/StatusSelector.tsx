"use client";

import { DAY_STATUSES, STATUS_META, type DayStatus } from "@/lib/report";
import { CheckIcon, StatusIcon } from "./icons";

const ACTIVE_STYLES: Record<DayStatus, string> = {
  base: "border-status-base bg-status-base-soft text-status-base ring-status-base/25",
  pozo: "border-status-pozo bg-status-pozo-soft text-status-pozo ring-status-pozo/25",
  descanso:
    "border-status-descanso bg-status-descanso-soft text-status-descanso ring-status-descanso/25",
  licencia:
    "border-status-licencia bg-status-licencia-soft text-status-licencia ring-status-licencia/25",
};

interface StatusSelectorProps {
  value: DayStatus | "";
  onChange: (status: DayStatus) => void;
  describedBy?: string;
  disabled?: boolean;
}

export default function StatusSelector({
  value,
  onChange,
  describedBy,
  disabled = false,
}: StatusSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Ubicación del día"
      aria-describedby={describedBy}
      className="grid gap-3 sm:grid-cols-2"
    >
      {DAY_STATUSES.map((status) => {
        const meta = STATUS_META[status];
        const active = value === status;

        return (
          <label
            key={status}
            className={`relative flex items-start gap-3 rounded-md border p-4 transition-colors ${
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            } ${
              active
                ? `border-current ring-[3px] ${ACTIVE_STYLES[status]}`
                : "border-input hover:border-foreground/35 hover:bg-muted/40 has-[:focus]:ring-[3px] has-[:focus]:ring-ring/40"
            }`}
          >
            <input
              type="radio"
              name="status"
              value={status}
              checked={active}
              disabled={disabled}
              onChange={() => onChange(status)}
              className="sr-only"
            />
            <StatusIcon
              status={status}
              className={`mt-0.5 size-5 shrink-0 ${active ? "" : "text-muted-foreground"}`}
            />
            <span>
              <span className="block font-display text-[21px] leading-none tracking-[0.02em]">
                {meta.label}
              </span>
              <span className="mt-1 block text-[13px] leading-[1.35] text-muted-foreground">
                {meta.note}
              </span>
            </span>
            {active ? <CheckIcon className="ml-auto size-4 shrink-0" /> : null}
          </label>
        );
      })}
    </div>
  );
}
