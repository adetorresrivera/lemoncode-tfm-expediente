import { useEffect } from "react";
import { ApplicationDetailComponent } from "./application-detail.component";
import { useApplicationDetail } from "./application-detail.hooks";
import type { RenderListLink } from "./application-detail.vm";

interface Props {
  applicationId: string;
  renderListLink: RenderListLink;
  onDeleted: () => void;
}

export function ApplicationDetailContainer({
  applicationId,
  renderListLink,
  onDeleted,
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
      renderListLink={renderListLink}
    />
  );
}
