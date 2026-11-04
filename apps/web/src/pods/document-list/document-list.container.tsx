import type { DocumentType } from "@tfm/contracts";
import { useRef, type ReactElement } from "react";
import { DocumentListComponent } from "./document-list.component";
import { useDocumentList } from "./document-list.hooks";
import { countLabel } from "./document-list.mapper";

interface Props {
  type: DocumentType | undefined;
  onTypeChange: (type: DocumentType | undefined) => void;
  // The scene bumps this number after an upload; the list reloads keeping its rows on screen.
  refreshToken: number;
  // The scene builds the page header around the pod's own counter.
  renderHeader: (header: { counter: ReactElement }) => ReactElement;
}

export function DocumentListContainer({
  type,
  onTypeChange,
  refreshToken,
  renderHeader,
}: Props) {
  const { status, rows, errorCode, refreshing, retry, feedback } =
    useDocumentList(type, refreshToken);
  const resultsRef = useRef<HTMLElement | null>(null);

  const firstLoad = status === "loading" && !refreshing;
  const count = firstLoad || status === "error" ? null : rows.length;

  const handleRetry = () => {
    retry();
    resultsRef.current?.focus();
  };

  return (
    <DocumentListComponent
      status={status}
      rows={rows}
      errorCode={errorCode}
      refreshing={refreshing}
      onRetry={handleRetry}
      type={type}
      onTypeChange={onTypeChange}
      counterLabel={countLabel(count)}
      feedback={feedback}
      resultsRef={resultsRef}
      renderHeader={renderHeader}
      onDelete={() => {}}
      deleteDialog={null}
    />
  );
}
