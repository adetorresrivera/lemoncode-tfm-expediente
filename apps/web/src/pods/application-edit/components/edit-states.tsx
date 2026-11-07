import { CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Skeleton } from "@/common/components/ui/skeleton";
import type { HttpErrorCode } from "@/core/http/http-client";
import type { RenderListLink } from "../application-edit.vm";

// The copy mirrors the detail states; the pod keeps its own copy (a pod never imports a pod).
const CARD_CLASS =
  "flex flex-col items-start gap-4 rounded-md border border-border bg-card p-6";
const HEADING_CLASS =
  "font-serif text-base font-semibold leading-[1.2] text-foreground";
const LINK_CLASS =
  "inline-flex h-11 items-center gap-2 self-start rounded-sm text-sm font-semibold text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

export function EditSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex max-w-3xl flex-col gap-6"
    >
      <span className="sr-only">Cargando candidatura…</span>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Skeleton className="h-6 w-1/2" />
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    </div>
  );
}

interface NotFoundProps {
  renderListLink: RenderListLink;
}

export function EditNotFound({ renderListLink }: NotFoundProps) {
  return (
    <div role="alert" className={CARD_CLASS}>
      <div className="flex items-start gap-2">
        <CircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />
        <div className="flex flex-col gap-2">
          <h2 className={HEADING_CLASS}>No encontramos esta candidatura</h2>
          <p className="text-sm text-foreground">
            Puede que la hayas eliminado.
          </p>
        </div>
      </div>
      {renderListLink({
        className: LINK_CLASS,
        children: "Volver a Mis candidaturas",
      })}
    </div>
  );
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

interface LoadErrorProps {
  code: HttpErrorCode;
  onRetry: () => void;
}

export function EditLoadError({ code, onRetry }: LoadErrorProps) {
  return (
    <div role="alert" className={CARD_CLASS}>
      <div className="flex items-start gap-2">
        <CircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />
        <div className="flex flex-col gap-2">
          <h2 className={HEADING_CLASS}>No se pudo cargar la candidatura</h2>
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
