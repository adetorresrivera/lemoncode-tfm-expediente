import type { InterviewOutcome } from "@tfm/contracts";
import { Check, Clock, X, type LucideIcon } from "lucide-react";

const OUTCOME_ICONS: Record<InterviewOutcome, LucideIcon> = {
  pendiente: Clock,
  superada: Check,
  no_superada: X,
};

interface Props {
  outcome: InterviewOutcome;
  label: string;
}

// The same neutral chip for all three outcomes: the icon and the label carry the meaning, never a
// colour, and no state colour is borrowed from the application statuses.
export function InterviewOutcomeBadge({ outcome, label }: Props) {
  const Icon = OUTCOME_ICONS[outcome];
  return (
    <span className="inline-flex items-center gap-2 rounded-sm bg-muted px-2 py-1 text-sm font-semibold text-foreground">
      <Icon aria-hidden="true" strokeWidth={1.5} className="size-4" />
      {label}
    </span>
  );
}
