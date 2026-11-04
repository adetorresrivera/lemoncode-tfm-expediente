import { getRouteApi } from "@tanstack/react-router";
import { useEffect } from "react";
import { DocumentUploadContainer } from "@/pods/document-upload";

const routeApi = getRouteApi("/documents/");

export function DocumentListScene() {
  const search = routeApi.useSearch();

  useEffect(() => {
    document.title = "Documentos · Expediente";
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Expediente
          </p>
          <h1
            tabIndex={-1}
            className="font-serif text-[28px] font-semibold leading-[1.2]"
          >
            Documentos
          </h1>
        </div>
        {/* The handler gains the list refresh when the library list arrives (05-08). */}
        <DocumentUploadContainer
          initialType={search.type}
          onUploaded={() => {}}
        />
      </header>
    </div>
  );
}
