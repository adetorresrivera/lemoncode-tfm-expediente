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
import type { InterviewVm } from "../application-detail.vm";

interface Props {
  // The round to delete; the dialog is open while it is not null.
  interview: InterviewVm | null;
  deleting: boolean;
  failed: boolean;
  onConfirm: () => void;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}

// One controlled dialog for the whole section (no trigger). Initial focus lands on «Conservar
// ronda» (Radix focuses the cancel button). While the DELETE is pending every close request is
// ignored and both buttons are aria-disabled; the confirm button never closes the dialog itself,
// the section does once the server has answered.
export function InterviewDeleteDialog({
  interview,
  deleting,
  failed,
  onConfirm,
  onClose,
  onCloseAutoFocus,
}: Props) {
  // Keeps the last round while Radix unmounts the content, so the text does not empty out.
  const [last, setLast] = useState(interview);
  if (interview !== null && interview !== last) setLast(interview);
  const shown = interview ?? last;

  const requestClose = () => {
    if (!deleting) onClose();
  };

  return (
    <AlertDialog
      open={interview !== null}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
    >
      <AlertDialogContent
        onOverlayClick={requestClose}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <AlertDialogTitle>
          {shown !== null ? `¿Eliminar la ronda ${shown.round}?` : ""}
        </AlertDialogTitle>
        <AlertDialogDescription className="break-words">
          {shown !== null
            ? `Vas a eliminar la ronda ${shown.round} (${shown.typeLabel}). Esta acción no se puede deshacer.`
            : ""}
        </AlertDialogDescription>
        <div role="status" aria-live="polite">
          {failed ? (
            <RequestStatus
              kind="error"
              message="No se pudo eliminar la ronda. Inténtalo de nuevo."
            />
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel aria-disabled={deleting}>
            Conservar ronda
          </AlertDialogCancel>
          <AlertDialogAction
            aria-disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              if (!deleting) onConfirm();
            }}
          >
            {deleting ? "Eliminando…" : "Eliminar ronda"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
