import { documentTypeSchema, type DocumentType } from "@tfm/contracts";
import { CircleAlert } from "lucide-react";
import { useEffect, useRef, type ReactNode, type Ref } from "react";
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
  ToggleGroup,
  ToggleGroupItem,
} from "@/common/components/ui/toggle-group";
import { DOCUMENT_TYPE_LABELS } from "@/common/lib/enum-labels";
import {
  useUploadForm,
  type UploadFormHandlers,
} from "../document-upload.hooks";
import {
  nameFromFileName,
  newUploadFormValues,
} from "../document-upload.mapper";
import type { UploadLiveMessage } from "../document-upload.vm";

const TOGGLE_ITEM_CLASS =
  "h-auto min-h-11 w-full justify-center whitespace-normal px-2 text-center leading-tight data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground";

const DIALOG_TITLES: Record<DocumentType, string> = {
  cv: "Subir CV",
  carta: "Subir carta de presentación",
};

interface DialogProps {
  open: boolean;
  onClose: () => void;
  // Picker mode: the type is fixed, the title names it and the Tipo control is not rendered.
  fixedType?: DocumentType;
  // Generic mode: the type the Tipo control starts on.
  initialType: DocumentType;
  uploading: boolean;
  liveMessage: UploadLiveMessage | null;
  handlers: UploadFormHandlers;
  onCancel: () => void;
  onCloseAutoFocus: (event: Event) => void;
}

// The one upload dialog, shared by the generic opener and the pickers. While a request is in
// flight every close request is ignored (Esc, the X); «Cancelar subida» is the only way out. An
// outside pointer never closes it: a stray click must not discard what was typed.
export function UploadDialog({
  open,
  onClose,
  fixedType,
  initialType,
  uploading,
  liveMessage,
  handlers,
  onCancel,
  onCloseAutoFocus,
}: DialogProps) {
  const handleOpenChange = (next: boolean) => {
    if (!next && !uploading) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onInteractOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogTitle>
          {fixedType === undefined
            ? "Subir documento"
            : DIALOG_TITLES[fixedType]}
        </DialogTitle>
        <DialogDescription>
          Sube un PDF o un DOCX. Se guarda en tu biblioteca de documentos.
        </DialogDescription>
        <UploadForm
          fixedType={fixedType}
          initialType={initialType}
          uploading={uploading}
          liveMessage={liveMessage}
          handlers={handlers}
          onClose={onClose}
          onCancel={onCancel}
        />
      </DialogContent>
    </Dialog>
  );
}

interface FormProps {
  fixedType?: DocumentType;
  initialType: DocumentType;
  uploading: boolean;
  liveMessage: UploadLiveMessage | null;
  handlers: UploadFormHandlers;
  onClose: () => void;
  onCancel: () => void;
}

// Mounted inside the dialog content: Radix unmounts the content when it closes, so every opening
// starts from empty values without an explicit reset.
function UploadForm({
  fixedType,
  initialType,
  uploading,
  liveMessage,
  handlers,
  onClose,
  onCancel,
}: FormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // The name the last file choice filled in; a name still equal to it was never edited.
  const prefillRef = useRef<string | null>(null);
  const { form } = useUploadForm({
    initialValues: newUploadFormValues(fixedType ?? initialType),
    ...handlers,
    // Waits one frame so React has rendered `aria-invalid` on the controls the validators marked.
    onInvalid: () => {
      requestAnimationFrame(() => {
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus();
      });
    },
  });

  // A disabled submit that held focus would drop it to <body>: it moves to the button that aborts.
  useEffect(() => {
    if (uploading) cancelRef.current?.focus();
  }, [uploading]);

  return (
    <form
      ref={formRef}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        // The React tree crosses the Radix portal: without stopPropagation a form that contains
        // the dialog (the application form) would receive this submit too.
        event.preventDefault();
        event.stopPropagation();
        if (form.state.isSubmitting) return;
        void form.handleSubmit();
      }}
    >
      {fixedType === undefined ? (
        <form.Field name="type">
          {(field) => (
            <div className="flex flex-col gap-1">
              <span
                id="upload-type-label"
                className="text-sm font-semibold leading-normal text-foreground"
              >
                Tipo
              </span>
              <ToggleGroup
                type="single"
                variant="outline"
                aria-labelledby="upload-type-label"
                className="grid w-full grid-cols-2"
                value={field.state.value}
                // Radix reports "" when the selected item is pressed again: a value always stays.
                onValueChange={(next) => {
                  const parsed = documentTypeSchema.safeParse(next);
                  if (parsed.success) field.handleChange(parsed.data);
                }}
              >
                {documentTypeSchema.options.map((option) => (
                  <ToggleGroupItem
                    key={option}
                    value={option}
                    className={TOGGLE_ITEM_CLASS}
                  >
                    {DOCUMENT_TYPE_LABELS[option]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}
        </form.Field>
      ) : null}
      <form.Field name="file">
        {(field) => {
          const error = firstFieldError(field.state.meta.errors);
          const hint = "PDF o DOCX, hasta 5 MB.";
          return (
            <Field
              id="upload-file"
              label="Archivo"
              required
              hint={hint}
              error={error}
            >
              <Input
                {...controlProps({
                  id: "upload-file",
                  hint,
                  error,
                  required: true,
                })}
                type="file"
                accept=".pdf,.docx"
                className="h-auto min-h-11 w-full min-w-0 border-0 bg-transparent px-0 file:mr-3 file:inline-flex file:h-11 file:cursor-pointer file:items-center file:rounded-md file:border file:border-border file:bg-background file:px-4 file:text-sm file:font-semibold file:text-foreground file:shadow-xs file:transition-colors hover:file:bg-accent hover:file:text-accent-foreground aria-invalid:file:border-destructive"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  field.handleChange(file);
                  if (file === null) return;
                  const current = form.getFieldValue("name");
                  if (current === "" || current === prefillRef.current) {
                    const prefill = nameFromFileName(file.name);
                    prefillRef.current = prefill;
                    form.setFieldValue("name", prefill);
                  }
                }}
              />
            </Field>
          );
        }}
      </form.Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <form.Field name="name">
          {(field) => {
            const error = firstFieldError(field.state.meta.errors);
            return (
              <div className="sm:col-span-2">
                <Field id="upload-name" label="Nombre" required error={error}>
                  <Input
                    {...controlProps({
                      id: "upload-name",
                      error,
                      required: true,
                    })}
                    maxLength={120}
                    autoComplete="off"
                    placeholder="Ej.: CV Frontend"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Field>
              </div>
            );
          }}
        </form.Field>
        <form.Field name="version">
          {(field) => {
            const error = firstFieldError(field.state.meta.errors);
            return (
              <Field id="upload-version" label="Versión" required error={error}>
                <Input
                  {...controlProps({
                    id: "upload-version",
                    error,
                    required: true,
                  })}
                  className="font-mono tabular"
                  maxLength={40}
                  autoComplete="off"
                  placeholder="Ej.: v3"
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
        <LiveLine message={liveMessage} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="submit"
          className="h-11 w-full sm:w-auto"
          disabled={uploading}
        >
          {uploading ? "Subiendo…" : "Subir documento"}
        </Button>
        <CancelButton
          buttonRef={cancelRef}
          uploading={uploading}
          onClose={onClose}
          onCancel={onCancel}
        />
      </div>
    </form>
  );
}

interface CancelProps {
  buttonRef: Ref<HTMLButtonElement>;
  uploading: boolean;
  onClose: () => void;
  onCancel: () => void;
}

// «Descartar subida» closes the dialog; while a request is in flight the same button aborts it.
function CancelButton({
  buttonRef,
  uploading,
  onClose,
  onCancel,
}: CancelProps) {
  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="outline"
      className="h-11 w-full sm:w-auto"
      onClick={uploading ? onCancel : onClose}
    >
      {uploading ? "Cancelar subida" : "Descartar subida"}
    </Button>
  );
}

function LiveLine({ message }: { message: UploadLiveMessage | null }) {
  if (message === null) return null;
  if (message.kind === "cancelled") {
    return <p className="text-sm text-muted-foreground">{message.message}</p>;
  }
  if (message.kind === "loading") {
    return <RequestStatus kind="loading" message={message.message} />;
  }
  return <RequestStatus kind="error" message={message.message} />;
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
    <div className="flex min-w-0 flex-col gap-1">
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
