import type { SVGProps } from "react";
import type { DayStatus } from "@/lib/report";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: "false",
} as const;

export function BaseIcon({ className = "size-5", ...props }: IconProps) {
  return (
    <svg {...baseProps} className={className} {...props}>
      <path d="M2 18h20" />
      <path d="M4 18v-3a8 8 0 0 1 16 0v3" />
      <path d="M10 7V4h4v3" />
    </svg>
  );
}

export function WellIcon({ className = "size-5", ...props }: IconProps) {
  return (
    <svg {...baseProps} className={className} {...props}>
      <path d="M12 3 5 20h14L12 3z" />
      <path d="M8 13h8" />
      <path d="M9.5 16.5h5" />
    </svg>
  );
}

export function RestIcon({ className = "size-5", ...props }: IconProps) {
  return (
    <svg {...baseProps} className={className} {...props}>
      <path d="M4 9h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
      <path d="M17 10h2a2 2 0 0 1 0 4h-2" />
      <path d="M7 4v2" />
      <path d="M11 3v3" />
    </svg>
  );
}

export function LicenseIcon({ className = "size-5", ...props }: IconProps) {
  return (
    <svg {...baseProps} className={className} {...props}>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="m5 20 14-12" />
    </svg>
  );
}

export function CheckIcon({ className = "size-4", ...props }: IconProps) {
  return (
    <svg {...baseProps} className={className} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function ClipboardIcon({ className = "size-4", ...props }: IconProps) {
  return (
    <svg {...baseProps} className={className} {...props}>
      <rect width="8" height="4" x="8" y="2" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}

export function ResetIcon({ className = "size-4", ...props }: IconProps) {
  return (
    <svg {...baseProps} className={className} {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export function CalendarIcon({ className = "size-6", ...props }: IconProps) {
  return (
    <svg {...baseProps} className={className} {...props}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
    </svg>
  );
}

export function ChevronLeftIcon({ className = "size-4", ...props }: IconProps) {
  return (
    <svg {...baseProps} className={className} {...props}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "size-4", ...props }: IconProps) {
  return (
    <svg {...baseProps} className={className} {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function StatusIcon({ status, ...props }: IconProps & { status: DayStatus }) {
  switch (status) {
    case "base":
      return <BaseIcon {...props} />;
    case "pozo":
      return <WellIcon {...props} />;
    case "descanso":
      return <RestIcon {...props} />;
    case "licencia":
      return <LicenseIcon {...props} />;
  }
}
