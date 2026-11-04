import { Download, FileText, Link2, Mail, Trash2 } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import type { DocumentRowVm } from "../document-list.vm";

interface Props {
  row: DocumentRowVm;
  // The button is handed over so the dialog can return focus to it after a cancel.
  onDelete: (row: DocumentRowVm, opener: HTMLButtonElement) => void;
}

// The type badge is neutral on purpose (UI-SPEC): CV and Carta differ by icon and text, never by
// a status colour. The usage badge is information, not a warning.
export function DocumentRow({ row, onDelete }: Props) {
  const TypeIcon = row.type === "cv" ? FileText : Mail;

  return (
    <li>
      <article className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between lg:p-6">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="min-w-0 break-words font-serif text-base font-semibold leading-[1.2] text-foreground">
            {row.name}
          </h2>
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-2 rounded-sm bg-muted px-2 py-1 text-sm font-semibold text-foreground">
              <TypeIcon
                aria-hidden="true"
                strokeWidth={1.5}
                className="size-4"
              />
              {row.typeLabel}
            </span>
            <span className="min-w-0 break-words font-mono tabular text-sm text-foreground">
              <span className="sr-only">Versión: </span>
              {row.version}
            </span>
            <time
              dateTime={row.createdAt}
              className="text-sm text-muted-foreground"
            >
              <span className="sr-only">Subido: </span>
              {row.dateLabel}
            </time>
            <span className="font-mono tabular text-sm text-muted-foreground">
              {row.sizeLabel}
            </span>
          </div>
          {row.usageLabel !== null ? (
            <div className="flex">
              <span className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-2 py-1 text-sm font-semibold text-foreground">
                <Link2
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="size-4"
                />
                {row.usageLabel}
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" className="h-11">
            <a href={row.downloadHref} download aria-label={row.downloadLabel}>
              <Download
                aria-hidden="true"
                strokeWidth={1.5}
                className="size-4"
              />
              Descargar
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="size-11"
            aria-label={row.deleteLabel}
            onClick={(event) => onDelete(row, event.currentTarget)}
          >
            <Trash2 aria-hidden="true" strokeWidth={1.5} className="size-4" />
          </Button>
        </div>
      </article>
    </li>
  );
}
