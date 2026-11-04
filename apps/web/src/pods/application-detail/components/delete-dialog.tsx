import { Trash2 } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/common/components/ui/alert-dialog";
import { Button } from "@/common/components/ui/button";
import type { DeleteState } from "../application-detail.vm";

interface Props {
  title: string;
  company: string;
  state: DeleteState;
  onConfirm: () => void;
}

// Initial focus lands on «Conservar candidatura» (Radix focuses the cancel button). While the
// DELETE is pending the dialog ignores every close request and both buttons are aria-disabled;
// the confirm button never closes the dialog by itself, the scene navigates away on success.
export function DeleteDialog({ title, company, state, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const deleting = state === "deleting";

  const handleOpenChange = (next: boolean) => {
    if (!next && deleting) return;
    setOpen(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11">
          <Trash2 aria-hidden="true" className="text-destructive" />
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onOverlayClick={() => handleOpenChange(false)}>
        <AlertDialogTitle>¿Eliminar esta candidatura?</AlertDialogTitle>
        <AlertDialogDescription className="break-words">
          Vas a eliminar «{title}» de {company}. Esta acción no se puede
          deshacer. Los documentos vinculados no se eliminan.
        </AlertDialogDescription>
        <div role="status" aria-live="polite">
          {state === "error" ? (
            <RequestStatus
              kind="error"
              message="No se pudo eliminar la candidatura. Inténtalo de nuevo."
            />
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel aria-disabled={deleting}>
            Conservar candidatura
          </AlertDialogCancel>
          <AlertDialogAction
            aria-disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              if (!deleting) onConfirm();
            }}
          >
            {deleting ? "Eliminando…" : "Eliminar candidatura"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
