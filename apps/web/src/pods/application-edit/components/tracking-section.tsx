import { useId } from "react";
import {
  applicationStatusSchema,
  type ApplicationStatus,
} from "@tfm/contracts";
import { StatusBadge } from "@/common/components/status-badge";
import { Input } from "@/common/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/common/components/ui/native-select";
import { Textarea } from "@/common/components/ui/textarea";
import { STATUS_LABELS } from "@/common/lib/enum-labels";
import type { ApplicationFormApi } from "../application-edit.hooks";
import { controlProps, firstFieldError } from "./field-props";
import { FormField } from "./form-field";

interface Props {
  form: ApplicationFormApi;
  mode: "create" | "edit";
  // Edit mode only: the status shown in the «Estado actual» line (changed from the detail).
  currentStatus?: ApplicationStatus;
}

const APPLIED_AT_HINT =
  "Si la dejas vacía, se rellena sola al pasar a Enviada.";

export function TrackingSection({ form, mode, currentStatus }: Props) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6"
    >
      <h2
        id={headingId}
        className="font-serif text-base font-semibold leading-[1.2]"
      >
        Seguimiento
      </h2>
      {mode === "create" ? (
        <form.Field name="status">
          {(field) => {
            const error = firstFieldError(field.state.meta.errors);
            return (
              <FormField id="field-status" label="Estado inicial" error={error}>
                <NativeSelect
                  {...controlProps({ id: "field-status", error })}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    field.handleChange(
                      applicationStatusSchema.safeParse(event.target.value)
                        .data ?? field.state.value,
                    )
                  }
                >
                  {applicationStatusSchema.options.map((status) => (
                    <NativeSelectOption key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
            );
          }}
        </form.Field>
      ) : currentStatus !== undefined ? (
        <p className="flex flex-wrap items-center gap-2">
          <span>Estado actual:</span>
          <StatusBadge status={currentStatus} />
          <span className="text-muted-foreground">
            Cámbialo desde el detalle.
          </span>
        </p>
      ) : null}
      <form.Field name="appliedAt">
        {(field) => {
          const error = firstFieldError(field.state.meta.errors);
          return (
            <FormField
              id="field-appliedAt"
              label="Fecha de envío"
              hint={APPLIED_AT_HINT}
              error={error}
            >
              <Input
                {...controlProps({
                  id: "field-appliedAt",
                  hint: APPLIED_AT_HINT,
                  error,
                })}
                name={field.name}
                type="date"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </FormField>
          );
        }}
      </form.Field>
      <form.Field name="sourceUrl">
        {(field) => {
          const error = firstFieldError(field.state.meta.errors);
          return (
            <FormField
              id="field-sourceUrl"
              label="Enlace de la oferta"
              error={error}
            >
              <Input
                {...controlProps({ id: "field-sourceUrl", error })}
                name={field.name}
                type="url"
                placeholder="https://"
                autoComplete="off"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </FormField>
          );
        }}
      </form.Field>
      <form.Field name="notes">
        {(field) => {
          const error = firstFieldError(field.state.meta.errors);
          return (
            <FormField id="field-notes" label="Notas" error={error}>
              <Textarea
                {...controlProps({ id: "field-notes", error })}
                name={field.name}
                rows={5}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </FormField>
          );
        }}
      </form.Field>
    </section>
  );
}
