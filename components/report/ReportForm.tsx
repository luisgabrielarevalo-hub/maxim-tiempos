"use client";

import {
  MAX_ACTIVITY_LENGTH,
  MAX_NOTES_LENGTH,
  REQUIRED_NOTES_STATUSES,
  type DayStatus,
  type ReportErrors,
  type ReportField,
  type ReportFormValues,
} from "@/lib/report";
import { CheckIcon, ClipboardIcon, ResetIcon } from "./icons";
import StatusSelector from "./StatusSelector";

const FIELD_CLASS =
  "w-full rounded-md border border-input bg-card px-3 py-2.5 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35";

const LABEL_CLASS =
  "mb-1.5 block font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase";

const ERROR_CLASS = "mt-1.5 text-[13px] font-medium text-destructive";

const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-md bg-primary px-[18px] py-2.5 font-display text-[19px] tracking-[0.06em] text-primary-foreground transition-colors hover:bg-primary/90";

const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-md border border-input bg-card px-[18px] py-2.5 font-display text-[19px] tracking-[0.06em] text-foreground transition-colors hover:bg-accent";

interface ReportFormProps {
  values: ReportFormValues;
  errors: ReportErrors;
  today: string;
  showSuccess: boolean;
  onChange: (field: ReportField, value: string) => void;
  onStatusChange: (status: DayStatus) => void;
  onClear: () => void;
}

function Counter({ length, max }: { length: number; max: number }) {
  return (
    <span
      className={`font-mono text-[11px] ${length > max ? "text-destructive" : "text-muted-foreground"}`}
    >
      {length}/{max}
    </span>
  );
}

export default function ReportForm({
  values,
  errors,
  today,
  showSuccess,
  onChange,
  onStatusChange,
  onClear,
}: ReportFormProps) {
  const wellRequired = values.status === "pozo";
  const notesRequired = values.status !== "" && REQUIRED_NOTES_STATUSES.includes(values.status);
  const activityLength = values.activity.trim().length;
  const notesLength = values.notes.trim().length;

  return (
    <form
      noValidate
      onSubmit={(event) => event.preventDefault()}
      className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
    >
      <section className="border-t border-border px-5 py-6 first:border-t-0 sm:px-7">
        <header className="mb-5 flex items-baseline gap-3">
          <span className="font-mono text-[11px] text-status-pozo">01</span>
          <h2 className="font-display text-[26px] leading-none font-normal tracking-[0.03em]">
            Datos de la jornada
          </h2>
        </header>

        <div className="max-w-[320px]">
          <label htmlFor="report-date" className={LABEL_CLASS}>
            Fecha del reporte
          </label>
          <input
            id="report-date"
            name="date"
            type="date"
            value={values.date}
            max={today}
            onChange={(event) => onChange("date", event.target.value)}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? "error-date" : undefined}
            className={FIELD_CLASS}
          />
          {errors.date ? (
            <p id="error-date" className={ERROR_CLASS}>
              {errors.date}
            </p>
          ) : null}
        </div>
      </section>

      <section className="border-t border-border px-5 py-6 sm:px-7">
        <header className="mb-5 flex items-baseline gap-3">
          <span className="font-mono text-[11px] text-status-pozo">02</span>
          <h2 className="font-display text-[26px] leading-none font-normal tracking-[0.03em]">
            ¿Dónde estuvo ese día?
          </h2>
        </header>

        <StatusSelector
          value={values.status}
          onChange={onStatusChange}
          describedBy={errors.status ? "error-status" : undefined}
        />
        {errors.status ? (
          <p id="error-status" className={ERROR_CLASS}>
            {errors.status}
          </p>
        ) : null}

        {wellRequired ? (
          <div className="mt-5 rounded-md border border-status-pozo/45 bg-status-pozo-soft/60 p-4 sm:p-5">
            <p className="mb-4 font-mono text-[10px] tracking-[0.18em] text-status-pozo uppercase">
              Detalle obligatorio por haber trabajado en pozo
            </p>

            <div className="grid gap-4">
              <div>
                <label htmlFor="report-well" className={LABEL_CLASS}>
                  ¿En qué pozo estuvo?
                </label>
                <input
                  id="report-well"
                  name="well"
                  type="text"
                  value={values.well}
                  autoComplete="off"
                  placeholder="Pozo, campo o número de plataforma"
                  onChange={(event) => onChange("well", event.target.value)}
                  aria-invalid={Boolean(errors.well)}
                  aria-describedby={errors.well ? "error-well" : undefined}
                  className={FIELD_CLASS}
                />
                {errors.well ? (
                  <p id="error-well" className={ERROR_CLASS}>
                    {errors.well}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="report-activity" className={LABEL_CLASS}>
                  Actividad realizada
                </label>
                <textarea
                  id="report-activity"
                  name="activity"
                  rows={4}
                  value={values.activity}
                  placeholder="Ej. Cambio de sarta de perforación y registro de parámetros"
                  onChange={(event) => onChange("activity", event.target.value)}
                  aria-invalid={Boolean(errors.activity)}
                  aria-describedby={errors.activity ? "error-activity" : undefined}
                  className={`${FIELD_CLASS} resize-y leading-relaxed`}
                />
                <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
                  {errors.activity ? (
                    <p id="error-activity" className={ERROR_CLASS}>
                      {errors.activity}
                    </p>
                  ) : (
                    <span />
                  )}
                  <Counter length={activityLength} max={MAX_ACTIVITY_LENGTH} />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="border-t border-border px-5 py-6 sm:px-7">
        <header className="mb-5 flex items-baseline gap-3">
          <span className="font-mono text-[11px] text-status-pozo">03</span>
          <h2 className="font-display text-[26px] leading-none font-normal tracking-[0.03em]">
            Observaciones
          </h2>
        </header>

        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="report-notes" className={`${LABEL_CLASS} mb-0`}>
            {notesRequired ? "Obligatorio para este día" : "Opcional"}
          </label>
          <Counter length={notesLength} max={MAX_NOTES_LENGTH} />
        </div>
        <textarea
          id="report-notes"
          name="notes"
          rows={4}
          value={values.notes}
          placeholder="Indica actividades realizadas y/o pozo y nombre de registro"
          onChange={(event) => onChange("notes", event.target.value)}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={errors.notes ? "error-notes" : undefined}
          className={`${FIELD_CLASS} resize-y leading-relaxed`}
        />
        {errors.notes ? (
          <p id="error-notes" className={ERROR_CLASS}>
            {errors.notes}
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/40 px-5 py-4 sm:px-7">
        <button type="submit" className={PRIMARY_BUTTON_CLASS}>
          <ClipboardIcon />
          Generar reporte
        </button>
        <button type="button" onClick={onClear} className={SECONDARY_BUTTON_CLASS}>
          <ResetIcon />
          Limpiar
        </button>
        <span
          role="status"
          aria-live="polite"
          className={`items-center gap-1.5 text-[13px] font-semibold text-status-descanso ${
            showSuccess ? "inline-flex" : "hidden"
          }`}
        >
          <CheckIcon />
          Reporte completo
        </span>
      </div>
    </form>
  );
}
