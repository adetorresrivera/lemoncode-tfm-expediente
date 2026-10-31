import { TagChip } from "@/common/components/tag-chip";
import type { DetailTagGroupVm } from "../application-detail.vm";

interface Props {
  groups: DetailTagGroupVm[];
}

export function TagsSection({ groups }: Props) {
  return (
    <section
      aria-labelledby="tags-heading"
      className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6"
    >
      <h2
        id="tags-heading"
        className="font-serif text-base font-semibold leading-[1.2]"
      >
        Etiquetas
      </h2>
      {groups.length === 0 ? (
        <p className="text-muted-foreground">Sin etiquetas.</p>
      ) : (
        groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {group.title}
            </p>
            <ul aria-label={group.title} className="flex flex-wrap gap-2">
              {group.tags.map((tag) => (
                <li key={tag.label} className="min-w-0 max-w-full">
                  <TagChip label={tag.label} soft={tag.soft} />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
