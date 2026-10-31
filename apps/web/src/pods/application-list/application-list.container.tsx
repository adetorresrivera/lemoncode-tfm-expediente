import type { ListSearch } from "@/core/router/application-search";
import { ApplicationListComponent } from "./application-list.component";
import { useApplicationList } from "./application-list.hooks";

interface Props {
  query: ListSearch;
  onQueryChange: (next: ListSearch) => void;
  onClearFilters: () => void;
}

export function ApplicationListContainer({ query }: Props) {
  const { status, applications, errorCode, refreshing, retry } =
    useApplicationList(query);

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
