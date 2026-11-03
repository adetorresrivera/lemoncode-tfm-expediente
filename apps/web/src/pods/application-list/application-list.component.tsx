import { useRef } from "react";
import type { HttpErrorCode } from "@/core/http/http-client";
import {
  hasActiveFilters,
  type ListSearch,
} from "@/core/router/application-search";
import {
  ApplicationCard,
  type RenderApplicationLink,
} from "./components/application-card";
import { EmptyFilteredState } from "./components/empty-filtered-state";
import { EmptyState, type RenderCreateLink } from "./components/empty-state";
import { FilterPanel } from "./components/filter-panel";
import { ListError } from "./components/list-error";
import { ListSkeleton } from "./components/list-skeleton";
import { ResultCount } from "./components/result-count";
import type { ApplicationListItem, StackTagsVm } from "./application-list.vm";

interface Props {
  status: "loading" | "ok" | "error";
  applications: ApplicationListItem[];
  errorCode: HttpErrorCode | null;
  refreshing: boolean;
  onRetry: () => void;
  query: ListSearch;
  onQueryChange: (next: ListSearch) => void;
  onClear: () => void;
  clearCount: number;
  stackTags: StackTagsVm;
  onRetryStackTags: () => void;
  renderApplicationLink: RenderApplicationLink;
  renderCreateLink: RenderCreateLink;
}

export function ApplicationListComponent({
  status,
  applications,
  errorCode,
  refreshing,
  onRetry,
  query,
  onQueryChange,
  onClear,
  clearCount,
  stackTags,
  onRetryStackTags,
  renderApplicationLink,
  renderCreateLink,
}: Props) {
  const resultsRef = useRef<HTMLElement>(null);

  const handleRetry = () => {
    onRetry();
    resultsRef.current?.focus();
  };

  const firstLoad = status === "loading" && !refreshing;
  const count = firstLoad || status === "error" ? null : applications.length;

  return (
    <div className="flex flex-col gap-4">
      <FilterPanel
        query={query}
        onQueryChange={onQueryChange}
        onClear={onClear}
        clearCount={clearCount}
        stackTags={stackTags}
        onRetryStackTags={onRetryStackTags}
      />
      <ResultCount count={count} />
      <section
        ref={resultsRef}
        aria-label="Resultados"
        aria-busy={refreshing}
        tabIndex={-1}
        className="outline-none"
      >
        {firstLoad ? (
          <ListSkeleton />
        ) : status === "error" ? (
          <ListError
            code={errorCode ?? "INTERNAL_ERROR"}
            onRetry={handleRetry}
          />
        ) : applications.length === 0 ? (
          hasActiveFilters(query) ? (
            <EmptyFilteredState onClear={onClear} />
          ) : (
            <EmptyState renderCreateLink={renderCreateLink} />
          )
        ) : (
          <ul aria-label="Candidaturas" className="flex flex-col gap-4">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                renderApplicationLink={renderApplicationLink}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
