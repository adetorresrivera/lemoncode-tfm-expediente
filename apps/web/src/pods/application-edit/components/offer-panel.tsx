import { ChevronDown, Sparkles } from "lucide-react";
import { useId } from "react";
import { RequestStatus } from "@/common/components/request-status";
import { Button } from "@/common/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/common/components/ui/collapsible";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import type {
  OfferAnalysisStatus,
  OfferErrorReason,
  OfferPanelModel,
} from "../application-edit.vm";

const ERROR_MESSAGES: Record<OfferErrorReason, string> = {
  timeout:
    "La IA ha tardado demasiado. Inténtalo otra vez o rellena el formulario a mano.",
  model:
    "No hemos podido leer la oferta. Inténtalo otra vez o rellena el formulario a mano.",
  network: "No hay conexión con el servidor. Inténtalo otra vez.",
};

const successMessage = (filled: number): string => {
  if (filled === 0) {
    return "No hemos encontrado datos nuevos en la oferta. Completa el formulario a mano.";
  }
  return filled === 1
    ? "Hemos rellenado 1 campo. Revísalo."
    : `Hemos rellenado ${filled} campos. Revísalos.`;
};

// The status line lives outside the collapsible content, always mounted, so an announcement is
// never lost when the user collapses the panel.
function AnalysisStatus({ status }: { status: OfferAnalysisStatus }) {
  switch (status.kind) {
    case "idle":
      return null;
    case "analysing":
      return <RequestStatus kind="loading" message="Analizando la oferta…" />;
    case "success":
      return (
        <RequestStatus kind="success" message={successMessage(status.filled)} />
      );
    case "error":
      return (
        <RequestStatus kind="error" message={ERROR_MESSAGES[status.reason]} />
      );
  }
}

export function OfferPanel({
  defaultOpen,
  draft,
  status,
  onDraftChange,
  onAnalyze,
}: OfferPanelModel) {
  const headingId = useId();
  const textareaId = useId();
  const analysing = status.kind === "analysing";

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6"
    >
      <Collapsible
        defaultOpen={defaultOpen}
        className="flex min-w-0 flex-col gap-4"
      >
        <h2
          id={headingId}
          className="font-serif text-base font-semibold leading-[1.2]"
        >
          <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            Pegar oferta
            <ChevronDown
              aria-hidden="true"
              strokeWidth={1.5}
              className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            />
          </CollapsibleTrigger>
        </h2>
        <CollapsibleContent className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Label htmlFor={textareaId}>Texto de la oferta</Label>
            <Textarea
              id={textareaId}
              className="min-h-40 resize-y"
              placeholder="Pega aquí la descripción completa de la oferta"
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="default"
              aria-disabled={analysing}
              className="h-11 w-full sm:w-auto"
              onClick={() => {
                if (analysing) return;
                onAnalyze();
              }}
            >
              <Sparkles aria-hidden="true" />
              Autocompletar con IA
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
      <div role="status" aria-live="polite">
        <AnalysisStatus status={status} />
      </div>
    </section>
  );
}
