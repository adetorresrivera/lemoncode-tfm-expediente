import { Button } from "@/common/components/ui/button";
import { EmptyState } from "./components/empty-state";
import type { ApplicationListItem } from "./application-list.vm";

interface Props {
  status: "loading" | "ok" | "error";
  applications: ApplicationListItem[];
  refreshing: boolean;
  onRetry: () => void;
}

// Minimal states for the tracer; plan 02-02 replaces them with the real loading, error and empty states.
export function ApplicationListComponent({
  status,
  applications,
  refreshing,
  onRetry,
}: Props) {
  if (status === "loading" && applications.length === 0) {
    return <p role="status">Cargando candidaturas…</p>;
  }

  if (status === "error") {
    return (
      <section className="flex flex-col items-start gap-3 rounded-md border border-border bg-card p-6">
        <p>No se han podido cargar las candidaturas.</p>
        <Button type="button" onClick={onRetry}>
          Reintentar
        </Button>
      </section>
    );
  }

  if (applications.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul
      aria-label="Candidaturas"
      aria-busy={refreshing}
      className="flex flex-col gap-3"
    >
      {applications.map((application) => (
        <li
          key={application.id}
          className="rounded-md border border-border bg-card p-4"
        >
          <p className="font-serif text-lg">{application.title}</p>
          <p className="text-muted-foreground">{application.company}</p>
        </li>
      ))}
    </ul>
  );
}
