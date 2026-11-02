import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { RequestStatus } from "@/common/components/request-status";
import { Button } from "@/common/components/ui/button";
import type {
  InterviewActions,
  InterviewFormValues,
  InterviewVm,
} from "../application-detail.vm";
import { InterviewDialog } from "./interview-dialog";

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
