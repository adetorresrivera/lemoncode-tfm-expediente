import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/common/components/ui/button";

interface Props {
  kind: "loading" | "success" | "error";
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

// Markup only. The caller keeps an always-mounted `role="status" aria-live="polite"` container
// (or a `role="alert"` card for block-level errors) so the text change is announced.
export function RequestStatus({
  kind,
  message,
  onRetry,
  retryLabel = "Reintentar",
}: Props) {
  return (
    <div className="flex flex-wrap items-start gap-2 text-sm text-foreground">
      {kind === "loading" ? (
        <LoaderCircle
          aria-hidden="true"
          strokeWidth={1.5}
          className="mt-1 size-4 shrink-0 animate-spin motion-reduce:animate-none"
        />
      ) : kind === "success" ? (
        <Check
          aria-hidden="true"
          strokeWidth={1.5}
          className="mt-1 size-4 shrink-0"
        />
      ) : (
        <CircleAlert
          aria-hidden="true"
          strokeWidth={1.5}
          className="mt-1 size-4 shrink-0"
        />
      )}
      <span>{message}</span>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
