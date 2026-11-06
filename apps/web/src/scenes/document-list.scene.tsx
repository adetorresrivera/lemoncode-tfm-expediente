import type { DocumentType } from "@tfm/contracts";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DocumentListContainer } from "@/pods/document-list";
import { DocumentUploadContainer } from "@/pods/document-upload";

const routeApi = getRouteApi("/documents/");

export function DocumentListScene() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  // Bumped after every upload; the list reloads keeping its rows on screen (D-27).
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    document.title = "Documentos · Expediente";
  }, []);

  // Every filter change replaces the history entry, so Back leaves the page instead of replaying
  // filter clicks. The search object is never spread: only the known key goes back to the URL.
  const handleTypeChange = (type: DocumentType | undefined) => {
    void navigate({ search: type ? { type } : {}, replace: true });
  };

  // When a filter is active and the uploaded document is of another type, the filter follows it
  // so the new row is visible (UI-SPEC §4). In «Todos» only the list reloads.
  const handleUploaded = (uploaded: { id: string; type: DocumentType }) => {
    setRefresh((n) => n + 1);
    if (search.type !== undefined && search.type !== uploaded.type) {
      handleTypeChange(uploaded.type);
    }
  };

  return (
    <DocumentListContainer
      type={search.type}
      onTypeChange={handleTypeChange}
      refreshToken={refresh}
      renderHeader={({ counter }) => (
        <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              Expediente
            </p>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1
                tabIndex={-1}
                className="font-serif text-[28px] font-semibold leading-[1.2]"
              >
                Documentos
              </h1>
              {counter}
            </div>
          </div>
          <DocumentUploadContainer
            initialType={search.type}
            onUploaded={handleUploaded}
          />
        </header>
      )}
    />
  );
}
