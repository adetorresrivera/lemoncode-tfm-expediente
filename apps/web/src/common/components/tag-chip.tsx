import { Check, X } from "lucide-react";
import { cn } from "@/common/lib/utils";

const BASE =
  "inline-flex h-7 max-w-full min-w-0 items-center gap-1 rounded-sm border border-border bg-card px-2 text-sm font-semibold text-foreground";

interface Props {
  label: string;
  soft?: boolean;
  onRemove?: () => void;
  selected?: boolean;
  onToggle?: () => void;
}

export function TagChip({ label, soft, onRemove, selected, onToggle }: Props) {
  if (onToggle) {
    return (
      <button
        type="button"
        aria-pressed={selected === true}
        onClick={onToggle}
        className={cn(
          BASE,
          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
          soft && "border-dashed",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "hover:bg-accent",
        )}
      >
        {selected ? (
          <Check aria-hidden="true" className="size-4 shrink-0" />
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
        onRemove !== undefined && "pr-1",
      )}
    >
      <span className="truncate" title={label}>
        {label}
      </span>
      {onRemove ? (
        <button
          type="button"
          aria-label={`Quitar ${label}`}
          onClick={onRemove}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </span>
  );
}
