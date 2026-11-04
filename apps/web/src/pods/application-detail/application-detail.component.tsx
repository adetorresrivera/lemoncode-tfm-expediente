import type { ApplicationStatus } from "@tfm/contracts";
import { ArrowLeft, Pencil } from "lucide-react";
import { StatusBadge } from "@/common/components/status-badge";
import { Button } from "@/common/components/ui/button";
import type { HttpErrorCode } from "@/core/http/http-client";
import type {
  ApplicationDetailVm,
  DeleteState,
  DetailDocumentsVm,
  InterviewActions,
  RenderEditLink,
  RenderListLink,
  StatusFeedback,
} from "./application-detail.vm";
import {
  BACK_LINK_CLASS,
  DetailLoadError,
  DetailNotFound,
  DetailSkeleton,
} from "./components/detail-states";
import { DeleteDialog } from "./components/delete-dialog";
import { DocumentsSection } from "./components/documents-section";
import { InterviewsSection } from "./components/interviews-section";
import { NotesSection } from "./components/notes-section";
import { OfferDataSection } from "./components/offer-data-section";
import { OfferTextSection } from "./components/offer-text-section";
import { StatusChange } from "./components/status-change";
import { StatusHistory } from "./components/status-history";
import { TagsSection } from "./components/tags-section";

interface Props {
  status: "loading" | "ok" | "notFound" | "error";
  vm: ApplicationDetailVm | null;
  errorCode: HttpErrorCode | null;
  onRetry: () => void;
  onChangeStatus: (next: ApplicationStatus) => void;
  statusPending: boolean;
  statusFeedback: StatusFeedback | null;
  deleteState: DeleteState;
  onDelete: () => void;
  interviewActions: InterviewActions;
  documents: DetailDocumentsVm;
  renderListLink: RenderListLink;
  renderEditLink: RenderEditLink;
  notice: string;
  focusHeadingRef: (node: HTMLElement | null) => void;
}

export function ApplicationDetailComponent({
  status,
  vm,
  errorCode,
  onRetry,
  onChangeStatus,
  statusPending,
  statusFeedback,
  deleteState,
  onDelete,
  interviewActions,
  documents,
  renderListLink,
  renderEditLink,
  notice,
  focusHeadingRef,
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              Expediente
            </p>
            <h1
              ref={focusHeadingRef}
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
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <Button asChild className="h-11">
              {renderEditLink({
                children: (
                  <>
                    <Pencil aria-hidden="true" />
                    Editar
                  </>
                ),
              })}
            </Button>
            <DeleteDialog
              title={vm.title}
              company={vm.company}
              state={deleteState}
              onConfirm={onDelete}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
          <div className="sm:flex sm:min-h-11 sm:items-center">
            <StatusBadge status={vm.status} />
          </div>
          <StatusChange
            value={vm.status}
            pending={statusPending}
            locked={interviewActions.busy}
            feedback={statusFeedback}
            onChange={onChangeStatus}
          />
        </div>
      </header>
      <p
        role="status"
        aria-live="polite"
        className="text-sm text-foreground empty:-mt-6"
      >
        {notice}
      </p>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <OfferDataSection vm={vm} />
          <TagsSection groups={vm.tagGroups} />
          <InterviewsSection
            interviews={vm.interviews}
            newValues={vm.newInterviewValues}
            actions={interviewActions}
          />
          <NotesSection notes={vm.notes} />
          {vm.offerText ? <OfferTextSection offerText={vm.offerText} /> : null}
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-1">
          <StatusHistory history={vm.history} />
          <DocumentsSection documents={documents} />
        </div>
      </div>
    </div>
  );
}
