import { EmptyState } from "./components/empty-state";
import type { ApplicationListItem } from "./application-list.vm";

interface Props {
  applications: ApplicationListItem[];
}

export function ApplicationListComponent({ applications }: Props) {
  if (applications.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul aria-label="Candidaturas" className="flex flex-col gap-3">
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
