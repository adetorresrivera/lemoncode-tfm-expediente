import { OFFER_TEXT_MAX, OFFER_TEXT_MIN } from "@tfm/contracts";
import { ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { RequestStatus } from "@/common/components/request-status";
import { Button } from "@/common/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/common/components/ui/collapsible";
import { Label } from "@/common/components/ui/label";
import { cn } from "@/common/lib/utils";
import { Textarea } from "@/common/components/ui/textarea";
import type {
  OfferAnalysisStatus,
  OfferErrorReason,
  OfferPanelModel,
  RelevantField,
} from "../application-edit.vm";

// Every number shown comes from the contracts constants and is formatted the same way: es-ES
// groups four-digit numbers only when asked to («1.234»).
const numberFormat = new Intl.NumberFormat("es-ES", { useGrouping: "always" });
const MIN_TEXT = numberFormat.format(OFFER_TEXT_MIN);
const MAX_TEXT = numberFormat.format(OFFER_TEXT_MAX);

const ERROR_MESSAGES: Record<OfferErrorReason, string> = {
  length: `La oferta debe tener entre ${MIN_TEXT} y ${MAX_TEXT} caracteres.`,
  timeout:
    "La IA ha tardado demasiado. Inténtalo otra vez o rellena el formulario a mano.",
  model:
    "No hemos podido leer la oferta. Inténtalo otra vez o rellena el formulario a mano.",
  network: "No hay conexión con el servidor. Inténtalo otra vez.",
};

const RELEVANT_LABELS: Record<RelevantField, string> = {
  title: "Puesto",
  company: "Empresa",
  workMode: "Modalidad",
  seniority: "Seniority",
};

// «Puesto», «Empresa y Seniority», «Puesto, Empresa y Seniority» (form order, final «y»).
const joinLabels = (labels: string[]): string =>
  labels.length <= 1
    ? labels.join("")
    : `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;

const fieldsText = (count: number): string =>
  count === 1 ? "1 campo" : `${count} campos`;

const tagsText = (count: number): string =>
  count === 1 ? "1 etiqueta" : `${count} etiquetas`;

// One sentence per case: nothing new, fields only, tags only or both. The closing verb agrees with
// what is shown («Revísalo», «Revísala», «Revísalos», «Revísalas»).
const summaryMessage = (filled: number, tagsAdded: number): string => {
  if (filled === 0 && tagsAdded === 0) {
    return "No hemos encontrado datos nuevos en la oferta. Completa el formulario a mano.";
  }
  if (tagsAdded === 0) {
    return `Hemos rellenado ${fieldsText(filled)}. ${filled === 1 ? "Revísalo." : "Revísalos."}`;
  }
  if (filled === 0) {
    return `Hemos añadido ${tagsText(tagsAdded)}. ${tagsAdded === 1 ? "Revísala." : "Revísalas."}`;
  }
  return `Hemos rellenado ${fieldsText(filled)} y añadido ${tagsText(tagsAdded)}. Revísalos.`;
};

const successMessage = (
  filled: number,
  tagsAdded: number,
  missing: RelevantField[],
): string => {
  const summary = summaryMessage(filled, tagsAdded);
  if (missing.length === 0) return summary;
  const labels = joinLabels(missing.map((field) => RELEVANT_LABELS[field]));
  return `${summary} Te falta completar: ${labels}.`;
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
        <RequestStatus
          kind="success"
          message={successMessage(
            status.filled,
            status.tagsAdded,
            status.missing,
          )}
        />
      );
    case "error":
      return (
        <RequestStatus kind="error" message={ERROR_MESSAGES[status.reason]} />
      );
    case "cancelled":
      return (
        <p className="text-sm text-muted-foreground">Análisis cancelado.</p>
      );
  }
}

export function OfferPanel({
  open,
  onOpenChange,
  draft,
  status,
  onDraftChange,
  onAnalyze,
  onCancel,
}: OfferPanelModel) {
  const analyzeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(open);
  const headingId = useId();
  const textareaId = useId();
  const hintId = useId();
  const counterId = useId();
  const analysing = status.kind === "analysing";
  // The gate counts what the API validates (trimmed), the counter and the limit what maxLength
  // caps (the raw draft): both are UTF-16 code units, the unit of String.length and of Zod.
  const tooShort = draft.trim().length < OFFER_TEXT_MIN;
  const atLimit = draft.length >= OFFER_TEXT_MAX;
  // Radix unmounts the content on close, so focus on the AI button would fall to the body: when
  // the panel folds and focus is lost or was inside it, it goes to the trigger. A user typing in a
  // form field keeps focus there (D-20).
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      const active = document.activeElement;
      if (
        active === null ||
        active === document.body ||
        !active.isConnected ||
        contentRef.current?.contains(active)
      ) {
        triggerRef.current?.focus();
      }
    }
    wasOpenRef.current = open;
  }, [open]);

  const hint = tooShort
    ? `Pega al menos ${MIN_TEXT} caracteres`
    : atLimit
      ? `Has llegado al límite de ${MAX_TEXT} caracteres.`
      : null;

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6"
    >
      <Collapsible
        open={open}
        onOpenChange={onOpenChange}
        className="flex min-w-0 flex-col gap-4"
      >
        <h2
          id={headingId}
          className="font-serif text-base font-semibold leading-[1.2]"
        >
          <CollapsibleTrigger
            ref={triggerRef}
            disabled={analysing}
            className="group flex min-h-11 w-full items-center justify-between rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Pegar oferta
            <ChevronDown
              aria-hidden="true"
              strokeWidth={1.5}
              className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            />
          </CollapsibleTrigger>
        </h2>
        <CollapsibleContent
          ref={contentRef}
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <Label htmlFor={textareaId}>Texto de la oferta</Label>
            <Textarea
              id={textareaId}
              className={cn("min-h-40 resize-y", analysing && "bg-muted")}
              readOnly={analysing}
              placeholder="Pega aquí la descripción completa de la oferta"
              value={draft}
              maxLength={OFFER_TEXT_MAX}
              aria-describedby={
                hint === null ? counterId : `${hintId} ${counterId}`
              }
              onChange={(event) => onDraftChange(event.target.value)}
            />
            <div className="flex flex-wrap items-start justify-between gap-2">
              {hint !== null && (
                <p id={hintId} className="text-sm text-muted-foreground">
                  {hint}
                </p>
              )}
              <p
                id={counterId}
                className="ml-auto shrink-0 font-mono tabular text-sm text-muted-foreground"
              >
                {numberFormat.format(draft.length)} / {MAX_TEXT}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              ref={analyzeRef}
              type="button"
              variant="default"
              aria-disabled={tooShort || analysing}
              aria-describedby={tooShort ? hintId : undefined}
              className="h-11 w-full sm:w-auto aria-disabled:opacity-50"
              onClick={() => {
                if (tooShort || analysing) return;
                onAnalyze();
              }}
            >
              <Sparkles aria-hidden="true" strokeWidth={1.5} />
              Autocompletar con IA
            </Button>
            {analysing && (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full sm:w-auto"
                onClick={() => {
                  onCancel();
                  analyzeRef.current?.focus();
                }}
              >
                Cancelar análisis
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <div role="status" aria-live="polite">
        <AnalysisStatus status={status} />
      </div>
    </section>
  );
}
