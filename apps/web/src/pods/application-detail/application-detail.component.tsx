import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/common/components/status-badge";
import type { HttpErrorCode } from "@/core/http/http-client";
import type {
  ApplicationDetailVm,
  RenderListLink,
} from "./application-detail.vm";
import {
  BACK_LINK_CLASS,
  DetailLoadError,
  DetailNotFound,
  DetailSkeleton,
} from "./components/detail-states";
import { NotesSection } from "./components/notes-section";
import { OfferDataSection } from "./components/offer-data-section";
import { OfferTextSection } from "./components/offer-text-section";
import { StatusHistory } from "./components/status-history";
import { TagsSection } from "./components/tags-section";

interface Props {
  status: "loading" | "ok" | "notFound" | "error";
  vm: ApplicationDetailVm | null;
  errorCode: HttpErrorCode | null;
  onRetry: () => void;
  renderListLink: RenderListLink;
}

export function ApplicationDetailComponent({
  status,
  vm,
  errorCode,
  onRetry,
  renderListLink,
}: Props) {
  if (status === "loading") return <DetailSkeleton />;
  if (status === "notFound") {
    return <DetailNotFound renderListLink={renderListLink} />;
  }
  if (status === "error" || vm === null) {
    return (
      <DetailLoadError code={errorCode ?? "INTERNAL_ERROR"} onRetry={onRetry} />
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
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <OfferDataSection vm={vm} />
          <TagsSection groups={vm.tagGroups} />
          <NotesSection notes={vm.notes} />
          {vm.offerText ? <OfferTextSection offerText={vm.offerText} /> : null}
        </div>
        <div className="min-w-0 lg:col-span-1">
          <StatusHistory history={vm.history} />
        </div>
      </div>
    </div>
  );
}
