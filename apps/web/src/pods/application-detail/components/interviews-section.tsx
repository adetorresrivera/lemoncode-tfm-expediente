import { interviewTypeSchema } from "@tfm/contracts";
import { CircleAlert, Plus } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
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
import { INTERVIEW_TYPE_LABELS } from "@/common/lib/enum-labels";
import { useInterviewForm } from "../application-detail.hooks";
import type {
  InterviewActions,
  InterviewFormValues,
  InterviewVm,
} from "../application-detail.vm";

interface Props {
  interviews: InterviewVm[];
  newValues: InterviewFormValues;
  actions: InterviewActions;
}

// «Rondas de entrevista»: the list plus the add dialog. The section makes no request of its own:
// the rounds arrive in the view model and every change goes through `actions`.
export function InterviewsSection({ interviews, newValues, actions }: Props) {
  const [open, setOpen] = useState(false);
  // Radix returns focus only to a Trigger; the dialog is controlled and trigger-less, so the
  // opener is stored on click and focused again in `onCloseAutoFocus`.
  const openerRef = useRef<HTMLElement | null>(null);

  return (
    <section
      aria-labelledby="interviews-heading"
      className="flex min-w-0 flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="interviews-heading"
          className="font-serif text-base font-semibold leading-[1.2]"
        >
          Rondas de entrevista
        </h2>
        <Button
          type="button"
          variant="outline"
          className="h-11 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          aria-disabled={actions.busy}
          onClick={(event) => {
            if (actions.busy) return;
            openerRef.current = event.currentTarget;
            setOpen(true);
          }}
        >
          <Plus aria-hidden="true" strokeWidth={1.5} />
          Añadir ronda
        </Button>
      </div>
      <div role="status" aria-live="polite" className="empty:-mt-4">
        {actions.feedback !== null ? (
          <div className="pt-2">
            <RequestStatus kind="success" message={actions.feedback} />
          </div>
        ) : null}
      </div>
      {interviews.length === 0 ? (
        <p className="text-muted-foreground">
          Aún no hay rondas. Añade la primera cuando te convoquen.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {interviews.map((interview) => (
            <li
              key={interview.id}
              className="flex min-w-0 flex-col gap-2 border-t border-border pt-4 first:border-t-0 first:pt-0"
            >
              <h3 className="min-w-0 break-words font-serif text-base font-semibold leading-[1.2]">
                {interview.title}
              </h3>
            </li>
          ))}
        </ol>
      )}
      <InterviewDialog
        open={open}
        title="Añadir ronda"
        description="Anota los datos de la entrevista. Solo el tipo es obligatorio."
        initialValues={newValues}
        saving={actions.busy}
        onSave={async (values) => {
          await actions.add(values);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const opener = openerRef.current;
          if (opener?.isConnected === true) opener.focus();
        }}
      />
    </section>
  );
}

interface DialogProps {
  open: boolean;
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
function InterviewDialog({
  open,
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
  initialValues: InterviewFormValues;
  saving: boolean;
  onSave: (values: InterviewFormValues) => Promise<void>;
  onClose: () => void;
}

// Mounted inside the dialog content: Radix unmounts the content when it closes, so every opening
// starts from `initialValues` without an explicit reset.
function InterviewForm({ initialValues, saving, onSave, onClose }: FormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const { form, saveFailed } = useInterviewForm({
    initialValues,
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
            const hint = "Si lo vacías, se asigna la siguiente.";
            return (
              <Field
                id="interview-round"
                label="Ronda"
                hint={hint}
                error={error}
              >
                <Input
                  {...controlProps({ id: "interview-round", hint, error })}
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
            className="mt-0.5 size-4 shrink-0 text-destructive"
          />
          <span>{error}</span>
        </p>
      ) : null}
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
