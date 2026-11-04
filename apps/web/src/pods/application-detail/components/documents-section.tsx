import { CircleAlert, Download } from "lucide-react";
import { Skeleton } from "@/common/components/ui/skeleton";
import type {
  DetailDocumentSlotVm,
  DetailDocumentsVm,
} from "../application-detail.vm";

const EYEBROW_CLASS =
  "text-[11px] uppercase tracking-[0.08em] text-muted-foreground";

interface RowProps {
  label: string;
  emptyText: string;
  slot: DetailDocumentSlotVm;
}

// Both rows are always present. The failure sentence sits in an always-mounted polite slot so a
// screen reader hears it when the request settles.
function DocumentRow({ label, emptyText, slot }: RowProps) {
  return (
    <li className="flex min-w-0 flex-col gap-1 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <span className={EYEBROW_CLASS}>{label}</span>
      {slot.kind === "none" ? (
        <p className="text-muted-foreground">{emptyText}</p>
      ) : null}
      {slot.kind === "loading" ? (
        <>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-16" />
        </>
      ) : null}
      {slot.kind === "ok" ? (
        <>
          <p className="break-words">{slot.document.label}</p>
          <p className="font-mono tabular text-sm text-muted-foreground">
            {slot.document.sizeLabel}
          </p>
          <a
            href={slot.document.downloadHref}
            download
            aria-label={slot.document.downloadLabel}
            className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Download className="size-4" strokeWidth={1.5} aria-hidden="true" />
            Descargar
          </a>
        </>
      ) : null}
      <div aria-live="polite">
        {slot.kind === "error" ? (
          <p className="flex items-start gap-2 text-sm text-foreground">
            <CircleAlert
              className="mt-1 size-4 shrink-0 text-foreground"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            No hemos podido cargar este documento.
          </p>
        ) : null}
      </div>
    </li>
  );
}

interface Props {
  documents: DetailDocumentsVm;
}

// «Documentos» of the aside: the linked CV and cover letter, each with its own outcome so one
// failed request never hides the other row or the rest of the detail (D-25).
export function DocumentsSection({ documents }: Props) {
  const loading =
    documents.cv.kind === "loading" || documents.coverLetter.kind === "loading";
  return (
    <section
      aria-labelledby="documents-heading"
      aria-busy={loading}
      className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6"
    >
      <h2
        id="documents-heading"
        className="font-serif text-base font-semibold leading-[1.2]"
      >
        Documentos
      </h2>
      <div role="status" aria-live="polite" className="sr-only">
        {loading ? "Cargando documentos…" : null}
      </div>
      <ul className="flex flex-col gap-4">
        <DocumentRow
          label="CV"
          emptyText="Sin CV vinculado."
          slot={documents.cv}
        />
        <DocumentRow
          label="Carta de presentación"
          emptyText="Sin carta vinculada."
          slot={documents.coverLetter}
        />
      </ul>
    </section>
  );
}
