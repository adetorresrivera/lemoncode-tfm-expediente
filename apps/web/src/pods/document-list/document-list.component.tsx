import { documentTypeSchema, type DocumentType } from "@tfm/contracts";
import { CircleAlert, RotateCcw } from "lucide-react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { RequestStatus } from "@/common/components/request-status";
import { Button } from "@/common/components/ui/button";
import { Skeleton } from "@/common/components/ui/skeleton";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/common/components/ui/toggle-group";
import type { HttpErrorCode } from "@/core/http/http-client";
import { DocumentRow } from "./components/document-row";
import type { DocumentRowVm } from "./document-list.vm";

const ALL_VALUE = "all";
const PLACEHOLDER_KEYS = ["first", "second", "third"];

interface Props {
  status: "loading" | "ok" | "error";
  rows: DocumentRowVm[];
  errorCode: HttpErrorCode | null;
  refreshing: boolean;
  onRetry: () => void;
  type: DocumentType | undefined;
  onTypeChange: (type: DocumentType | undefined) => void;
  counterLabel: string;
  feedback: string | null;
  resultsRef: RefObject<HTMLElement | null>;
  renderHeader: (header: { counter: ReactElement }) => ReactElement;
  onDelete: (row: DocumentRowVm, opener: HTMLButtonElement) => void;
  // The delete confirmation dialog, owned by the container.
  deleteDialog: ReactNode;
}

// Fixed copy chosen by code: the server message is never rendered.
const errorBody = (code: HttpErrorCode): string => {
  switch (code) {
    case "NETWORK_ERROR":
      return "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.";
    case "INVALID_RESPONSE":
      return "El servidor respondió algo inesperado. Inténtalo de nuevo.";
    default:
      return "Algo ha fallado. Inténtalo de nuevo.";
  }
};

const emptyText = (type: DocumentType | undefined): string => {
  if (type === "cv") return "Aún no has subido ningún CV.";
  if (type === "carta") return "Aún no has subido ninguna carta.";
  return "Aún no has subido ningún documento. Empieza subiendo tu CV.";
};

function TypeFilter({
  type,
  onTypeChange,
}: {
  type: DocumentType | undefined;
  onTypeChange: (type: DocumentType | undefined) => void;
}) {
  // Radix reports an empty value when the pressed item is pressed again: ignored, so the group
  // can never be left without a selection.
  const handleValueChange = (value: string) => {
    if (value === "") return;
    if (value === ALL_VALUE) {
      onTypeChange(undefined);
      return;
    }
    const parsed = documentTypeSchema.safeParse(value);
    if (parsed.success) onTypeChange(parsed.data);
  };

  const itemClass =
    "h-11 px-4 text-sm font-semibold data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground";

  return (
    <div
      role="group"
      aria-label="Tipo de documento"
      className="flex flex-col gap-1"
    >
      <p className="text-[11px] font-semibold leading-normal tracking-[0.08em] text-muted-foreground uppercase">
        Tipo
      </p>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={2}
        className="flex-wrap"
        value={type ?? ALL_VALUE}
        onValueChange={handleValueChange}
      >
        <ToggleGroupItem value={ALL_VALUE} className={itemClass}>
          Todos
        </ToggleGroupItem>
        <ToggleGroupItem value="cv" className={itemClass}>
          CV
        </ToggleGroupItem>
        <ToggleGroupItem value="carta" className={itemClass}>
          Carta
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Cargando documentos…</span>
      {PLACEHOLDER_KEYS.map((key) => (
        <div
          key={key}
          aria-hidden="true"
          className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 lg:p-6"
        >
          <Skeleton className="h-6 w-2/3" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListError({
  code,
  onRetry,
}: {
  code: HttpErrorCode;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-md border border-border bg-card p-6"
    >
      <div className="flex items-start gap-2">
        <CircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-base font-semibold leading-[1.2] text-foreground">
            No se pudieron cargar los documentos
          </h2>
          <p className="text-sm text-foreground">{errorBody(code)}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-11"
        onClick={onRetry}
      >
        <RotateCcw aria-hidden="true" />
        Reintentar
      </Button>
    </div>
  );
}

function EmptyState({
  type,
  onShowAll,
}: {
  type: DocumentType | undefined;
  onShowAll: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-md border border-border bg-card p-6">
      <p className="text-muted-foreground">{emptyText(type)}</p>
      {type !== undefined ? (
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={onShowAll}
        >
          Ver todos los documentos
        </Button>
      ) : null}
    </div>
  );
}

export function DocumentListComponent({
  status,
  rows,
  errorCode,
  refreshing,
  onRetry,
  type,
  onTypeChange,
  counterLabel,
  feedback,
  resultsRef,
  renderHeader,
  onDelete,
  deleteDialog,
}: Props) {
  const firstLoad = status === "loading" && !refreshing;

  const counter = (
    <p aria-live="polite" className="text-sm text-muted-foreground">
      {counterLabel}
    </p>
  );

  return (
    <div className="flex flex-col gap-6">
      {renderHeader({ counter })}
      <div className="flex flex-col gap-4">
        <div role="status" aria-live="polite">
          {feedback !== null ? (
            <RequestStatus kind="success" message={feedback} />
          ) : null}
        </div>
        <TypeFilter type={type} onTypeChange={onTypeChange} />
        <section
          ref={resultsRef}
          aria-label="Resultados"
          aria-busy={refreshing}
          tabIndex={-1}
          className="min-w-0 outline-none"
        >
          {firstLoad ? (
            <ListSkeleton />
          ) : status === "error" ? (
            <ListError code={errorCode ?? "INTERNAL_ERROR"} onRetry={onRetry} />
          ) : rows.length === 0 ? (
            <EmptyState type={type} onShowAll={() => onTypeChange(undefined)} />
          ) : (
            <ul aria-label="Documentos" className="flex flex-col gap-4">
              {rows.map((row) => (
                <DocumentRow key={row.id} row={row} onDelete={onDelete} />
              ))}
            </ul>
          )}
        </section>
      </div>
      {deleteDialog}
    </div>
  );
}
