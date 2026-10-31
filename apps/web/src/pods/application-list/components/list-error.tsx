import { CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import type { HttpErrorCode } from "@/core/http/http-client";

interface Props {
  code: HttpErrorCode;
  onRetry: () => void;
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

export function ListError({ code, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-md border border-border bg-card p-6"
    >
      <div className="flex items-start gap-2">
        <CircleAlert
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-destructive"
        />
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-base font-semibold leading-[1.2] text-foreground">
            No se pudieron cargar las candidaturas
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
