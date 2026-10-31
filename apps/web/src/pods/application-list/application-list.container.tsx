import { ApplicationListComponent } from "./application-list.component";
import { useApplicationList } from "./application-list.hooks";

export function ApplicationListContainer() {
  const { status, applications, refreshing, retry } = useApplicationList();

  return (
    <ApplicationListComponent
      status={status}
      applications={applications}
      refreshing={refreshing}
      onRetry={retry}
    />
  );
}
