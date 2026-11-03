import { getRouteApi, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/common/components/ui/button";
import {
  pickListSearch,
  type ListSearch,
} from "@/core/router/application-search";
import { useArrivalNotice } from "@/core/router/use-arrival-notice";
import { ApplicationListContainer } from "@/pods/application-list";

const routeApi = getRouteApi("/applications/");

export function ApplicationListScene() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const query = pickListSearch(search);
  const { notice, focusHeadingRef } = useArrivalNotice();

  useEffect(() => {
    document.title = "Mis candidaturas · Expediente";
  }, []);

  // Every list navigation replaces the current history entry, so Back leaves the list instead of
  // replaying keystrokes and filter clicks.
  const handleQueryChange = (next: ListSearch) => {
    void navigate({ search: pickListSearch(next), replace: true });
  };

  const handleClearFilters = () => {
    void navigate({ search: {}, replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Expediente
          </p>
          <h1
            ref={focusHeadingRef}
            tabIndex={-1}
            className="font-serif text-[28px] font-semibold leading-[1.2]"
          >
            Mis candidaturas
          </h1>
        </div>
        <Button asChild className="h-11 w-full sm:w-auto">
          <Link to="/applications/new">
            <Plus aria-hidden="true" />
            Añadir candidatura
          </Link>
        </Button>
      </header>
      <p role="status" aria-live="polite" className="text-sm text-foreground">
        {notice}
      </p>
      <ApplicationListContainer
        query={query}
        onQueryChange={handleQueryChange}
        onClearFilters={handleClearFilters}
        renderApplicationLink={({ applicationId, className, children }) => (
          <Link
            to="/applications/$applicationId"
            params={{ applicationId }}
            className={className}
          >
            {children}
          </Link>
        )}
        renderCreateLink={({ className, children }) => (
          <Link to="/applications/new" className={className}>
            {children}
          </Link>
        )}
      />
    </div>
  );
}
