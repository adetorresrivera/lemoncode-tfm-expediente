import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { RequestStatus } from "@/common/components/request-status";
import { Button } from "@/common/components/ui/button";
import type {
  InterviewActions,
  InterviewFormMode,
  InterviewFormValues,
  InterviewVm,
} from "../application-detail.vm";
import { InterviewDeleteDialog } from "./interview-delete-dialog";
import { InterviewDialog } from "./interview-dialog";
import { InterviewItem } from "./interview-item";

interface Props {
  interviews: InterviewVm[];
  newValues: InterviewFormValues;
  actions: InterviewActions;
}

// «Rondas de entrevista»: the list plus the add dialog. The section makes no request of its own:
// the rounds arrive in the view model and every change goes through `actions`.
export function InterviewsSection({ interviews, newValues, actions }: Props) {
  // The dialog keeps its mode and round after closing so its content does not change while Radix
  // unmounts it; only `open` flips.
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: InterviewFormMode;
    interview: InterviewVm | null;
  }>({ open: false, mode: "add", interview: null });
  // Radix returns focus only to a Trigger; the dialog is controlled and trigger-less, so the
  // opener is stored on click and focused again in `onCloseAutoFocus`.
  const openerRef = useRef<HTMLElement | null>(null);
  // Delete confirmation: the round, a local failure flag and the opener of that dialog. After a
  // completed delete the opener is gone, so focus moves to «Añadir ronda» instead.
  const [pendingDelete, setPendingDelete] = useState<InterviewVm | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const deleteOpenerRef = useRef<HTMLElement | null>(null);
  const deletedRef = useRef(false);
  const addRef = useRef<HTMLButtonElement>(null);

  const closeDialog = () =>
    setDialog((previous) => ({ ...previous, open: false }));

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
          ref={addRef}
          type="button"
          variant="outline"
          className="h-11 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          aria-disabled={actions.busy}
          onClick={(event) => {
            if (actions.busy) return;
            openerRef.current = event.currentTarget;
            setDialog({ open: true, mode: "add", interview: null });
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
            <InterviewItem
              key={interview.id}
              interview={interview}
              busy={actions.busy}
              onEdit={(opener, target) => {
                openerRef.current = opener;
                setDialog({ open: true, mode: "edit", interview: target });
              }}
              onDelete={(opener, target) => {
                deleteOpenerRef.current = opener;
                deletedRef.current = false;
                setDeleteFailed(false);
                setPendingDelete(target);
              }}
            />
          ))}
        </ol>
      )}
      <InterviewDialog
        open={dialog.open}
        mode={dialog.mode}
        title={
          dialog.interview !== null
            ? `Editar ronda ${dialog.interview.round}`
            : "Añadir ronda"
        }
        description={
          dialog.interview !== null
            ? "Cambia los datos de esta ronda."
            : "Anota los datos de la entrevista. Solo el tipo es obligatorio."
        }
        initialValues={dialog.interview?.editValues ?? newValues}
        saving={actions.busy}
        onSave={async (values) => {
          if (dialog.interview !== null) {
            await actions.update(dialog.interview.id, values);
          } else {
            await actions.add(values);
          }
          closeDialog();
        }}
        onClose={closeDialog}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const opener = openerRef.current;
          if (opener?.isConnected === true) opener.focus();
        }}
      />
      <InterviewDeleteDialog
        interview={pendingDelete}
        deleting={actions.busy}
        failed={deleteFailed}
        onConfirm={() => {
          if (pendingDelete === null) return;
          setDeleteFailed(false);
          actions.remove(pendingDelete.id).then(
            () => {
              deletedRef.current = true;
              setPendingDelete(null);
            },
            () => setDeleteFailed(true),
          );
        }}
        onClose={() => setPendingDelete(null)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const opener = deleteOpenerRef.current;
          if (!deletedRef.current && opener?.isConnected === true) {
            opener.focus();
          } else {
            addRef.current?.focus();
          }
        }}
      />
    </section>
  );
}
