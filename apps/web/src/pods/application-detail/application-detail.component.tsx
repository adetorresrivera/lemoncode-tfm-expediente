import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/common/components/status-badge";
import type { HttpErrorCode } from "@/core/http/http-client";
import type {
  ApplicationDetailVm,
  RenderListLink,
} from "./application-detail.vm";

interface Props {
  status: "loading" | "ok" | "notFound" | "error";
  vm: ApplicationDetailVm | null;
  errorCode: HttpErrorCode | null;
  onRetry: () => void;
  renderListLink: RenderListLink;
}

const BACK_LINK_CLASS =
  "inline-flex h-11 items-center gap-2 self-start rounded-sm text-sm font-semibold text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ApplicationDetailComponent({
  status,
  vm,
  errorCode,
  onRetry,
  renderListLink,
}: Props) {
  if (status === "loading") {
    return (
      <div role="status" aria-busy="true">
        Cargando candidatura…
      </div>
    );
  }
  if (status === "notFound") {
    return (
      <div role="alert">
        <p>No encontramos esta candidatura</p>
        {renderListLink({
          className: BACK_LINK_CLASS,
          children: "Volver a Mis candidaturas",
        })}
      </div>
    );
  }
  if (status === "error" || vm === null) {
    return (
      <div role="alert">
        <p>No se pudo cargar la candidatura</p>
        <p>{errorCode}</p>
        <button type="button" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        {renderListLink({
          className: BACK_LINK_CLASS,
          children: (
            <>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Mis candidaturas
            </>
          ),
        })}
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Expediente
          </p>
          <h1
            tabIndex={-1}
            className="min-w-0 break-words font-serif text-[28px] font-semibold leading-[1.2]"
          >
            {vm.title}
          </h1>
          <p className="min-w-0 break-words">
            {vm.company}
            {vm.location ? (
              <span className="text-muted-foreground"> · {vm.location}</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
          <StatusBadge status={vm.status} />
        </div>
      </header>
    </div>
  );
}
