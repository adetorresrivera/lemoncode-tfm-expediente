import { Check, Sparkles, X } from "lucide-react";
import { cn } from "@/common/lib/utils";

const BASE =
  "inline-flex h-7 max-w-full min-w-0 items-center gap-1 rounded-sm border border-border bg-card px-2 text-sm font-semibold text-foreground";

interface Props {
  label: string;
  soft?: boolean;
  onRemove?: () => void;
  selected?: boolean;
  onToggle?: () => void;
  // The AI proposed this tag and the user has not removed it yet (D-14). Static and removable
  // chips only; the toggle chip is a filter and never carries the mark.
  aiSuggested?: boolean;
}

export function TagChip({
  label,
  soft,
  onRemove,
  selected,
  onToggle,
  aiSuggested,
}: Props) {
  if (onToggle) {
    return (
      <button
        type="button"
        aria-pressed={selected === true}
        onClick={onToggle}
        className={cn(
          BASE,
          "h-11 outline-none focus-visible:ring-2 focus-visible:ring-ring",
          soft && "border-dashed",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "hover:bg-accent",
        )}
      >
        {selected ? (
          <Check
            aria-hidden="true"
            strokeWidth={1.5}
            className="size-4 shrink-0"
          />
        ) : null}
        <span className="truncate" title={label}>
          {label}
        </span>
      </button>
    );
  }

  return (
    <span
      className={cn(
        BASE,
        soft && "border-dashed",
        onRemove !== undefined && "h-11 pr-0",
      )}
    >
      {aiSuggested === true ? (
        <Sparkles
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-3 shrink-0 text-primary"
        />
      ) : null}
      <span className="truncate" title={label}>
        {label}
      </span>
      {aiSuggested === true ? (
        <span className="sr-only">(propuesta por IA)</span>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Quitar ${label}`}
          onClick={onRemove}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" strokeWidth={1.5} className="size-4" />
        </button>
      ) : null}
    </span>
  );
}
