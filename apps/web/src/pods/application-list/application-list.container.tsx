import { ApplicationListComponent } from "./application-list.component";
import { useApplicationList } from "./application-list.hooks";

export function ApplicationListContainer() {
  const { status, applications, errorCode, refreshing, retry } =
    useApplicationList();

  return (
    <ApplicationListComponent
      status={status}
      applications={applications}
      errorCode={errorCode}
      refreshing={refreshing}
      onRetry={retry}
    />
  );
}
