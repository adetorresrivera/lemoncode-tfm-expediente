import { StatusBadge } from "@/common/components/status-badge";
import { TagChip } from "@/common/components/tag-chip";
import type { ApplicationListItem } from "../application-list.vm";

interface Props {
  application: ApplicationListItem;
}

export function ApplicationCard({ application }: Props) {
  const {
    title,
    company,
    location,
    status,
    visibleTags,
    hiddenTagCount,
    salary,
    updatedAtLabel,
  } = application;

  return (
    <li>
      <article className="relative flex flex-col gap-2 rounded-md border border-border bg-card p-4 hover:border-input lg:p-6">
        <h2 className="min-w-0 break-words font-serif text-base font-semibold leading-[1.2]">
          {title}
          <span className="sr-only">, {company}</span>
        </h2>
        <p className="min-w-0 break-words text-sm text-muted-foreground">
          {location ? `${company} · ${location}` : company}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {visibleTags.length > 0 ? (
            <ul aria-label="Etiquetas" className="flex min-w-0 flex-wrap gap-2">
              {visibleTags.map((tag) => (
                <li key={tag.label} className="min-w-0 max-w-full">
                  <TagChip label={tag.label} soft={tag.soft} />
                </li>
              ))}
            </ul>
          ) : null}
          {hiddenTagCount > 0 ? (
            <span className="text-sm text-muted-foreground">
              +{hiddenTagCount}
              <span className="sr-only"> etiquetas más</span>
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          {salary ? (
            <p className="font-mono tabular text-sm">{salary}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Actualizada {updatedAtLabel}
          </p>
        </div>
      </article>
    </li>
  );
}
