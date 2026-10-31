import { useState } from "react";
import type { ListSearch } from "@/core/router/application-search";
import { ApplicationListComponent } from "./application-list.component";
import { useApplicationList } from "./application-list.hooks";

interface Props {
  query: ListSearch;
  onQueryChange: (next: ListSearch) => void;
  onClearFilters: () => void;
}

export function ApplicationListContainer({
  query,
  onQueryChange,
  onClearFilters,
}: Props) {
  const { status, applications, errorCode, refreshing, retry } =
    useApplicationList(query);
  const [clearCount, setClearCount] = useState(0);

  const handleClear = () => {
    setClearCount((n) => n + 1);
    onClearFilters();
  };

  return (
    <ApplicationListComponent
      status={status}
      applications={applications}
      errorCode={errorCode}
      refreshing={refreshing}
      onRetry={retry}
      query={query}
      onQueryChange={onQueryChange}
      onClear={handleClear}
      clearCount={clearCount}
    />
  );
}
