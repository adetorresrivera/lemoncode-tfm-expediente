import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import type { ApplicationDetailVm } from "../application-detail.vm";

interface Props {
  vm: ApplicationDetailVm;
}

const EYEBROW = "text-[11px] uppercase tracking-[0.08em] text-muted-foreground";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className={EYEBROW}>{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export function OfferDataSection({ vm }: Props) {
  const { location, salaryLine, appliedAtLabel, sourceUrl } = vm;
  const hasOptionalRows =
    location !== null ||
    salaryLine !== null ||
    appliedAtLabel !== null ||
    sourceUrl !== null;

  return (
    <section
      aria-labelledby="offer-data-heading"
      className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6"
    >
      <h2
        id="offer-data-heading"
        className="font-serif text-base font-semibold leading-[1.2]"
      >
        Datos de la oferta
      </h2>
      {hasOptionalRows ? null : (
        <p className="text-muted-foreground">
          Esta candidatura aún no tiene más datos de la oferta.
        </p>
      )}
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {location !== null ? <Row label="Ubicación">{location}</Row> : null}
        {salaryLine !== null ? <Row label="Salario">{salaryLine}</Row> : null}
        {appliedAtLabel !== null ? (
          <Row label="Fecha de envío">{appliedAtLabel}</Row>
        ) : null}
        {sourceUrl !== null ? (
          <Row label="Enlace">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1 rounded-sm text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ver oferta original
              <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </Row>
        ) : null}
        <Row label="Creada">{vm.createdAtLabel}</Row>
        <Row label="Actualizada">{vm.updatedAtLabel}</Row>
      </dl>
    </section>
  );
}
