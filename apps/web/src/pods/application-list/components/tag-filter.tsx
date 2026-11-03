import { useState } from "react";
import { RequestStatus } from "@/common/components/request-status";
import { TagChip } from "@/common/components/tag-chip";
import { Button } from "@/common/components/ui/button";
import { Skeleton } from "@/common/components/ui/skeleton";
import type { StackTagOptionVm } from "../application-list.vm";

const VISIBLE_OPTIONS = 10;

interface Props {
  status: "loading" | "ok" | "error";
  options: StackTagOptionVm[];
  selected: string[];
  onChange: (next: string[]) => void;
  onRetry: () => void;
}

export function TagFilter({
  status,
  options,
  selected,
  onChange,
  onRetry,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const optionLabels = options.map((option) => option.label);
  const shownOptions =
    expanded || optionLabels.length <= VISIBLE_OPTIONS
      ? optionLabels
      : optionLabels.slice(0, VISIBLE_OPTIONS);
  // A tag active in the URL is always rendered so it can be unselected, even while the options
  // load, when they fail, or when the tag is not among the visible ones.
  const extraSelected = selected.filter(
    (label) => !shownOptions.includes(label),
  );
  const chips = [...shownOptions, ...extraSelected];

  const toggle = (label: string) =>
    onChange(
      selected.includes(label)
        ? selected.filter((item) => item !== label)
        : [...selected, label],
    );

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold leading-normal tracking-[0.08em] text-muted-foreground uppercase">
        Stack
      </p>
      {chips.length > 0 ? (
        <ul aria-label="Stack" className="flex flex-wrap gap-2">
          {chips.map((label) => (
            <li key={label} className="min-w-0 max-w-full">
              <TagChip
                label={label}
                selected={selected.includes(label)}
                onToggle={() => toggle(label)}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {status === "loading" ? (
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-7 w-16" />
          ))}
        </div>
      ) : null}
      <div role="status" aria-live="polite">
        {status === "error" ? (
          <RequestStatus
            kind="error"
            message="No se pudieron cargar las etiquetas."
            onRetry={onRetry}
          />
        ) : null}
      </div>
      {status === "ok" && chips.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay etiquetas de stack.
        </p>
      ) : null}
      {status === "ok" && optionLabels.length > VISIBLE_OPTIONS ? (
        <Button
          type="button"
          variant="ghost"
          className="h-11 self-start"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded
            ? "Mostrar menos"
            : `Mostrar todas (${optionLabels.length})`}
        </Button>
      ) : null}
      {selected.length >= 2 ? (
        <p className="text-sm text-muted-foreground">
          Solo candidaturas con todas las etiquetas elegidas.
        </p>
      ) : null}
    </div>
  );
}
