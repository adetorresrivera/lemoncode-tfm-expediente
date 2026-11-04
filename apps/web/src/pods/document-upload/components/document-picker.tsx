import type { DocumentType } from "@tfm/contracts";
import { CircleAlert } from "lucide-react";
import { useId } from "react";
import { RequestStatus } from "@/common/components/request-status";
import { Label } from "@/common/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/common/components/ui/native-select";
import type { DocumentOptionsState } from "../document-upload.vm";

interface PickerCopy {
  label: string;
  none: string;
  empty: string;
}

const PICKER_COPY: Record<DocumentType, PickerCopy> = {
  cv: {
    label: "CV",
    none: "Sin CV",
    empty: "Aún no has subido ningún CV.",
  },
  carta: {
    label: "Carta de presentación",
    none: "Sin carta",
    empty: "Aún no has subido ninguna carta.",
  },
};

const LOADING_OPTION = "Cargando documentos…";
const ERROR_OPTION = "No se pudo cargar la lista";
const ERROR_MESSAGE = "No se pudieron cargar los documentos.";
const LINKED_OPTION = "Documento vinculado";

interface Props {
  type: DocumentType;
  // The id of the linked document, "" when there is none.
  selectedId: string;
  onSelected: (id: string) => void;
  error?: string;
  options: DocumentOptionsState;
}

// Native select of the library documents of one type. While the list loads or failed, the select
// holds a single option whose value is the current `selectedId`, and changes are ignored: the form
// value never moves, so a stored link cannot be dropped by a list that is not there (D-13). Every
// button here is `type="button"` because the picker lives inside the application form.
export function DocumentPicker({
  type,
  selectedId,
  onSelected,
  error,
  options,
}: Props) {
  const id = useId();
  const copy = PICKER_COPY[type];
  const { status } = options;
  const isOk = status === "ok";
  const showEmptyHint = isOk && options.options.length === 0;
  const linkedIsMissing =
    isOk &&
    selectedId !== "" &&
    !options.options.some((option) => option.id === selectedId);

  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [showEmptyHint ? hintId : null, error !== undefined ? errorId : null]
      .filter((value) => value !== null)
      .join(" ") || undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label htmlFor={id}>{copy.label}</Label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <div className="min-w-0 sm:flex-1">
          <NativeSelect
            id={id}
            name={`${type}DocumentId`}
            className="w-full min-w-0"
            value={selectedId}
            aria-busy={status === "loading" ? true : undefined}
            aria-disabled={isOk ? undefined : true}
            aria-invalid={error !== undefined ? true : undefined}
            aria-describedby={describedBy}
            onChange={(event) => {
              if (isOk) onSelected(event.target.value);
            }}
          >
            {status === "loading" ? (
              <NativeSelectOption value={selectedId}>
                {LOADING_OPTION}
              </NativeSelectOption>
            ) : status === "error" ? (
              <NativeSelectOption value={selectedId}>
                {ERROR_OPTION}
              </NativeSelectOption>
            ) : (
              <>
                <NativeSelectOption value="">{copy.none}</NativeSelectOption>
                {options.options.map((option) => (
                  <NativeSelectOption key={option.id} value={option.id}>
                    {option.label}
                  </NativeSelectOption>
                ))}
                {linkedIsMissing ? (
                  <NativeSelectOption value={selectedId}>
                    {LINKED_OPTION}
                  </NativeSelectOption>
                ) : null}
              </>
            )}
          </NativeSelect>
        </div>
      </div>
      {showEmptyHint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {copy.empty}
        </p>
      ) : null}
      {error !== undefined ? (
        <p
          id={errorId}
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
      <div role="status" aria-live="polite">
        {status === "error" ? (
          <RequestStatus
            kind="error"
            message={ERROR_MESSAGE}
            onRetry={options.retry}
          />
        ) : null}
      </div>
    </div>
  );
}
