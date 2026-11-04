import { useEffect } from "react";
import { ApplicationDetailComponent } from "./application-detail.component";
import { useApplicationDetail } from "./application-detail.hooks";
import type { RenderEditLink, RenderListLink } from "./application-detail.vm";

interface Props {
  applicationId: string;
  renderListLink: RenderListLink;
  renderEditLink: RenderEditLink;
  onDeleted: () => void;
  notice: string;
  focusHeadingRef: (node: HTMLElement | null) => void;
}

export function ApplicationDetailContainer({
  applicationId,
  renderListLink,
  renderEditLink,
  onDeleted,
  notice,
  focusHeadingRef,
}: Props) {
  const {
    status,
    vm,
    errorCode,
    retry,
    changeStatus,
    pendingStatus,
    statusFeedback,
    remove,
    deleteState,
    interviewActions,
    documents,
  } = useApplicationDetail(applicationId, { onDeleted });
  const title = vm?.title;

  useEffect(() => {
    if (title !== undefined) document.title = `${title} · Expediente`;
  }, [title]);

  return (
    <ApplicationDetailComponent
      status={status}
      vm={vm}
      errorCode={errorCode}
      onRetry={retry}
      onChangeStatus={changeStatus}
      statusPending={pendingStatus !== null}
      statusFeedback={statusFeedback}
      deleteState={deleteState}
      onDelete={remove}
      interviewActions={interviewActions}
      documents={documents}
      renderListLink={renderListLink}
      renderEditLink={renderEditLink}
      notice={notice}
      focusHeadingRef={focusHeadingRef}
    />
  );
}
