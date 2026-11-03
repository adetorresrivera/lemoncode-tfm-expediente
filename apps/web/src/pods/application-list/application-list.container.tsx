import { ApplicationListComponent } from "./application-list.component";
import { useApplicationList } from "./application-list.hooks";

export function ApplicationListContainer() {
  const { applications } = useApplicationList();

  return <ApplicationListComponent applications={applications} />;
}
