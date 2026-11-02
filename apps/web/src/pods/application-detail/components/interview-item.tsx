import { ChevronDown, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/common/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/common/components/ui/collapsible";
import type { InterviewVm } from "../application-detail.vm";
import { InterviewOutcomeBadge } from "./interview-outcome-badge";

interface Props {
  interview: InterviewVm;
  // True while any mutation of the detail is in flight: the actions stay in place but do nothing.
  busy: boolean;
  onEdit: (opener: HTMLElement, interview: InterviewVm) => void;
}

// One round: title with its actions, then date, mode and outcome, and the notes folded when there are any. Each
// value of the meta row is preceded by an `sr-only` prefix so a screen reader names what it reads.
export function InterviewItem({ interview, busy, onEdit }: Props) {
  const [notesOpen, setNotesOpen] = useState(false);
  const hasNotes = interview.notes !== null && interview.notes !== "";

  return (
    <li className="flex min-w-0 flex-col gap-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 break-words font-serif text-base font-semibold leading-[1.2]">
          {interview.title}
        </h3>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 aria-disabled:pointer-events-none aria-disabled:opacity-50"
            aria-label={`Editar ronda ${interview.round}`}
            aria-disabled={busy}
            onClick={(event) => {
              if (busy) return;
              onEdit(event.currentTarget, interview);
            }}
          >
            <Pencil aria-hidden="true" strokeWidth={1.5} />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>
          <span className="sr-only">Fecha: </span>
          {interview.scheduledAt !== null && interview.dateLabel !== null ? (
            <time dateTime={interview.scheduledAt} className="text-base">
              {interview.dateLabel}
            </time>
          ) : (
            <span className="text-base text-muted-foreground">Sin fecha</span>
          )}
        </span>
        <span>
          <span className="sr-only">Modalidad: </span>
          <span className="text-base text-muted-foreground">
            {interview.modeLabel}
          </span>
        </span>
        <span>
          <span className="sr-only">Resultado: </span>
          <InterviewOutcomeBadge
            outcome={interview.outcome}
            label={interview.outcomeLabel}
          />
        </span>
      </div>
      {hasNotes ? (
        <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full justify-between px-4"
            >
              <span>
                {notesOpen ? "Ocultar notas" : "Ver notas"}{" "}
                <span className="sr-only">de la ronda {interview.round}</span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform data-[state=open]:rotate-180 motion-reduce:transition-none"
                data-state={notesOpen ? "open" : "closed"}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <p className="whitespace-pre-wrap break-words text-base">
              {interview.notes}
            </p>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </li>
  );
}
