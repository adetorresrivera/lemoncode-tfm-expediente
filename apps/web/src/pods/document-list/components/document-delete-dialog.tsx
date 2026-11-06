import { useState } from "react";
import { RequestStatus } from "@/common/components/request-status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import type { DocumentDeleteState, DocumentRowVm } from "../document-list.vm";

interface Props {
  // The document to delete; the dialog is open while it is not null.
  row: DocumentRowVm | null;
  state: DocumentDeleteState;
  onConfirm: () => void;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}

// One controlled dialog for the whole list (no trigger). Initial focus lands on «Conservar
// documento» (Radix focuses the cancel button). While the DELETE is pending every close request is
// ignored and both buttons are aria-disabled; the confirm button never closes the dialog itself,
// the container does once the server has answered 204. A refusal (409 or any failure) keeps the
// dialog open with its message so the user can read it and try again.
export function DocumentDeleteDialog({
  row,
  state,
  onConfirm,
  onClose,
  onCloseAutoFocus,
}: Props) {
  // Keeps the last row while Radix unmounts the content, so the text does not empty out.
  const [last, setLast] = useState(row);
  if (row !== null && row !== last) setLast(row);
  const shown = row ?? last;
  const deleting = state.status === "deleting";

  const requestClose = () => {
    if (!deleting) onClose();
  };

  return (
    <AlertDialog
      open={row !== null}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
    >
      <AlertDialogContent
        onOverlayClick={requestClose}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <AlertDialogTitle>¿Eliminar este documento?</AlertDialogTitle>
        <AlertDialogDescription className="break-words">
          {shown !== null
            ? `Vas a eliminar «${shown.name}» (${shown.version}). Esta acción no se puede deshacer.`
            : ""}
        </AlertDialogDescription>
        <div role="status" aria-live="polite">
          {state.status === "error" ? (
            <RequestStatus kind="error" message={state.message} />
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel aria-disabled={deleting}>
            Conservar documento
          </AlertDialogCancel>
          <AlertDialogAction
            aria-disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              if (!deleting) onConfirm();
            }}
          >
            {deleting ? "Eliminando…" : "Eliminar documento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
