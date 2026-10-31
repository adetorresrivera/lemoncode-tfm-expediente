import { getRouteApi } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  pickListSearch,
  type ListSearch,
} from "@/core/router/application-search";
import { ApplicationListContainer } from "@/pods/application-list";

const routeApi = getRouteApi("/applications/");

export function ApplicationListScene() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const query = pickListSearch(search);

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
      <header className="flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Expediente
        </p>
        <h1
          tabIndex={-1}
          className="font-serif text-[28px] font-semibold leading-[1.2]"
        >
          Mis candidaturas
        </h1>
      </header>
      <ApplicationListContainer
        query={query}
        onQueryChange={handleQueryChange}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}
