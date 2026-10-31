import { useEffect } from "react";
import { ApplicationDetailComponent } from "./application-detail.component";
import { useApplicationDetail } from "./application-detail.hooks";
import type { RenderListLink } from "./application-detail.vm";

interface Props {
  applicationId: string;
  renderListLink: RenderListLink;
}

export function ApplicationDetailContainer({
  applicationId,
  renderListLink,
}: Props) {
  const { status, vm, errorCode, retry } = useApplicationDetail(applicationId);
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
      renderListLink={renderListLink}
    />
  );
}
