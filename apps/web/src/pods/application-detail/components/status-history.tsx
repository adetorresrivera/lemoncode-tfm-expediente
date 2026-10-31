import type { ApplicationStatus } from "@tfm/contracts";
import { STATUS_LABELS } from "@/common/lib/enum-labels";
import type { DetailHistoryEntryVm } from "../application-detail.vm";

// Literal class strings: Tailwind cannot see classes built from template strings.
const DOT_CLASS: Record<ApplicationStatus, string> = {
  guardada: "bg-status-saved",
  enviada: "bg-status-sent",
  en_entrevistas: "bg-status-interview",
  oferta_recibida: "bg-status-offer",
  aceptada: "bg-status-offer",
  rechazada: "bg-status-rejected",
  descartada: "bg-status-rejected",
};

interface Props {
  history: DetailHistoryEntryVm[];
}

// The VM arrives newest first; the first entry is the current status. The list is never empty
// and grows with the page.
export function StatusHistory({ history }: Props) {
  return (
    <section
      aria-labelledby="history-heading"
      className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6"
    >
      <h2
        id="history-heading"
        className="font-serif text-base font-semibold leading-[1.2]"
      >
        Historial de estados
      </h2>
      <ol className="flex flex-col gap-4 border-l border-border pl-4">
        {history.map((entry, index) => (
          <li
            key={`${entry.status}-${entry.atLabel}-${history.length - index}`}
            className="relative flex min-w-0 flex-col gap-1"
          >
            <span
              aria-hidden="true"
              className={`absolute top-1.5 -left-5 size-2 rounded-full ${DOT_CLASS[entry.status]}`}
            />
            {index === 0 ? (
              <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Actual
              </span>
            ) : null}
            <span className="font-semibold">{STATUS_LABELS[entry.status]}</span>
            <span className="text-sm text-muted-foreground">
              {entry.atLabel}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
