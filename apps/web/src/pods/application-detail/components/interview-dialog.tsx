import {
  interviewModeSchema,
  interviewOutcomeSchema,
  interviewTypeSchema,
} from "@tfm/contracts";
import { CircleAlert } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { RequestStatus } from "@/common/components/request-status";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/common/components/ui/native-select";
import { Textarea } from "@/common/components/ui/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/common/components/ui/toggle-group";
import {
  INTERVIEW_MODE_LABELS,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_TYPE_LABELS,
} from "@/common/lib/enum-labels";
import { useInterviewForm } from "../application-detail.hooks";
import type {
  InterviewFormMode,
  InterviewFormValues,
} from "../application-detail.vm";

// The counter groups four-digit numbers only when asked to («5.000»); 5000 is the contract limit
// of the notes, also the `maxLength` of the textarea.
const numberFormat = new Intl.NumberFormat("es-ES", { useGrouping: "always" });
const NOTES_MAX_TEXT = numberFormat.format(5000);

// Three equal columns, labels may wrap onto two lines instead of overflowing at 360 px.
const TOGGLE_ITEM_CLASS =
  "h-auto min-h-11 w-full justify-center whitespace-normal px-2 text-center leading-tight data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground";

interface DialogProps {
  open: boolean;
  mode: InterviewFormMode;
  title: string;
  description: string;
  initialValues: InterviewFormValues;
  saving: boolean;
  onSave: (values: InterviewFormValues) => Promise<void>;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}

// While a request is in flight every close request is ignored (Esc, the X, «Descartar cambios»).
// An outside pointer never closes it: a stray click must not discard what was typed.
export function InterviewDialog({
  open,
  mode,
  title,
  description,
  initialValues,
  saving,
  onSave,
  onClose,
  onCloseAutoFocus,
}: DialogProps) {
  const handleOpenChange = (next: boolean) => {
    if (!next && !saving) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onInteractOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <InterviewForm
          mode={mode}
          initialValues={initialValues}
          saving={saving}
          onSave={onSave}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

interface FormProps {
  mode: InterviewFormMode;
  initialValues: InterviewFormValues;
  saving: boolean;
  onSave: (values: InterviewFormValues) => Promise<void>;
  onClose: () => void;
}

// Mounted inside the dialog content: Radix unmounts the content when it closes, so every opening
// starts from `initialValues` without an explicit reset.
function InterviewForm({
  mode,
  initialValues,
  saving,
  onSave,
  onClose,
}: FormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const { form, saveFailed } = useInterviewForm({
    initialValues,
    mode,
    onSave,
    // Waits one frame so React has rendered `aria-invalid` on the controls the validators marked.
    onInvalid: () => {
      requestAnimationFrame(() => {
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus();
      });
    },
  });

  return (
    <form
      ref={formRef}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (form.state.isSubmitting) return;
        void form.handleSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="type">
          {(field) => {
            const error = firstFieldError(field.state.meta.errors);
            return (
              <Field id="interview-type" label="Tipo" required error={error}>
                <NativeSelect
                  {...controlProps({
                    id: "interview-type",
                    error,
                    required: true,
                  })}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    field.handleChange(
                      interviewTypeSchema.safeParse(event.target.value).data ??
                        "",
                    )
                  }
                >
                  <NativeSelectOption value="">
                    Elige un tipo
                  </NativeSelectOption>
                  {interviewTypeSchema.options.map((option) => (
                    <NativeSelectOption key={option} value={option}>
                      {INTERVIEW_TYPE_LABELS[option]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            );
          }}
        </form.Field>
        <form.Field name="round">
          {(field) => {
            const error = firstFieldError(field.state.meta.errors);
            // Adding: optional, the API numbers it. Editing: required, no hint (D-09, D-28).
            const required = mode === "edit";
            const hint = required
              ? undefined
              : "Si lo vacías, se asigna la siguiente.";
            return (
              <Field
                id="interview-round"
                label="Ronda"
                required={required}
                hint={hint}
                error={error}
              >
                <Input
                  {...controlProps({
                    id: "interview-round",
                    hint,
                    error,
                    required,
                  })}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </Field>
            );
          }}
        </form.Field>
      </div>
      <form.Field name="scheduledAt">
        {(field) => {
          const error = firstFieldError(field.state.meta.errors);
          const hint = "Opcional. Hora en tu zona horaria.";
          return (
            <Field
              id="interview-scheduled-at"
              label="Fecha y hora"
              hint={hint}
              error={error}
            >
              <Input
                {...controlProps({ id: "interview-scheduled-at", hint, error })}
                type="datetime-local"
                className="w-full min-w-0"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </Field>
          );
        }}
      </form.Field>
      <form.Field name="mode">
        {(field) => (
          <ToggleField id="interview-mode" label="Modalidad">
            <ToggleGroup
              type="single"
              variant="outline"
              aria-labelledby="interview-mode-label"
              className="grid w-full grid-cols-3"
              value={field.state.value}
              // Radix reports "" when the selected item is pressed again: a value always stays.
              onValueChange={(next) => {
                const parsed = interviewModeSchema.safeParse(next);
                if (parsed.success) field.handleChange(parsed.data);
              }}
            >
              {interviewModeSchema.options.map((option) => (
                <ToggleGroupItem
                  key={option}
                  value={option}
                  className={TOGGLE_ITEM_CLASS}
                >
                  {INTERVIEW_MODE_LABELS[option]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ToggleField>
        )}
      </form.Field>
      <form.Field name="outcome">
        {(field) => (
          <ToggleField id="interview-outcome" label="Resultado">
            <ToggleGroup
              type="single"
              variant="outline"
              aria-labelledby="interview-outcome-label"
              className="grid w-full grid-cols-3"
              value={field.state.value}
              onValueChange={(next) => {
                const parsed = interviewOutcomeSchema.safeParse(next);
                if (parsed.success) field.handleChange(parsed.data);
              }}
            >
              {interviewOutcomeSchema.options.map((option) => (
                <ToggleGroupItem
                  key={option}
                  value={option}
                  className={TOGGLE_ITEM_CLASS}
                >
                  {INTERVIEW_OUTCOME_LABELS[option]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ToggleField>
        )}
      </form.Field>
      <form.Field name="notes">
        {(field) => {
          const error = firstFieldError(field.state.meta.errors);
          const counterId = "interview-notes-counter";
          const describedBy =
            error !== undefined
              ? `interview-notes-error ${counterId}`
              : counterId;
          return (
            <Field id="interview-notes" label="Notas" error={error}>
              <Textarea
                {...controlProps({ id: "interview-notes", error })}
                aria-describedby={describedBy}
                className="resize-y"
                maxLength={5000}
                placeholder="Preguntas, impresiones, próximos pasos…"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
              <p
                id={counterId}
                className="self-end font-mono tabular text-sm text-muted-foreground"
              >
                {`${numberFormat.format(field.state.value.length)} / ${NOTES_MAX_TEXT}`}
              </p>
            </Field>
          );
        }}
      </form.Field>
      <div role="status" aria-live="polite">
        {saveFailed ? (
          <RequestStatus
            kind="error"
            message="No se pudo guardar la ronda. Inténtalo de nuevo."
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              className="h-11 w-full sm:w-auto"
              aria-disabled={isSubmitting}
            >
              {isSubmitting ? "Guardando…" : "Guardar ronda"}
            </Button>
          )}
        </form.Subscribe>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full sm:w-auto"
          onClick={() => {
            if (!saving) onClose();
          }}
        >
          Descartar cambios
        </Button>
      </div>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}

// Label, control, hint and error of one field, the same shape as the application form's (a pod
// never imports another pod, so the few lines are repeated here).
function Field({
  id,
  label,
  required = false,
  hint,
  error,
  children,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children}
      {hint !== undefined ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error !== undefined ? (
        <p
          id={`${id}-error`}
          className="flex items-start gap-2 text-sm text-foreground"
        >
          <CircleAlert
            aria-hidden="true"
            strokeWidth={1.5}
            className="mt-1 size-4 shrink-0"
          />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

interface ToggleFieldProps {
  id: string;
  label: string;
  children: ReactNode;
}

// A visible label that names a toggle group through `aria-labelledby` (a group has no single
// control for `htmlFor`).
function ToggleField({ id, label, children }: ToggleFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span
        id={`${id}-label`}
        className="text-sm font-semibold leading-normal text-foreground"
      >
        {label}
      </span>
      {children}
    </div>
  );
}

// First message of TanStack Form's error list (the strings our validator returns).
const firstFieldError = (errors: readonly unknown[]): string | undefined =>
  errors.find((error): error is string => typeof error === "string");

// The accessibility wiring a control shares: the ids of the hint and error lines that exist,
// invalid and required state.
const controlProps = ({
  id,
  hint,
  error,
  required,
}: {
  id: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) => {
  const describedBy = [
    hint !== undefined ? `${id}-hint` : null,
    error !== undefined ? `${id}-error` : null,
  ]
    .filter((value) => value !== null)
    .join(" ");
  return {
    id,
    "aria-describedby": describedBy === "" ? undefined : describedBy,
    "aria-invalid": error !== undefined ? (true as const) : undefined,
    "aria-required": required === true ? (true as const) : undefined,
  };
};
