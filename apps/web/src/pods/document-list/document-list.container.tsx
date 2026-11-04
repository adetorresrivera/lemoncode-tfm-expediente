import type { DocumentType } from "@tfm/contracts";
import { useRef, useState, type ReactElement } from "react";
import { HttpError } from "@/core/http/http-client";
import { DocumentDeleteDialog } from "./components/document-delete-dialog";
import { DocumentListComponent } from "./document-list.component";
import { useDocumentList } from "./document-list.hooks";
import { countLabel, deleteErrorMessage } from "./document-list.mapper";
import type { DocumentDeleteState, DocumentRowVm } from "./document-list.vm";

interface Props {
  type: DocumentType | undefined;
  onTypeChange: (type: DocumentType | undefined) => void;
  // The scene bumps this number after an upload; the list reloads keeping its rows on screen.
  refreshToken: number;
  // The scene builds the page header around the pod's own counter.
  renderHeader: (header: { counter: ReactElement }) => ReactElement;
}

const IDLE: DocumentDeleteState = { status: "idle" };

export function DocumentListContainer({
  type,
  onTypeChange,
  refreshToken,
  renderHeader,
}: Props) {
  const { status, rows, errorCode, refreshing, retry, remove, feedback } =
    useDocumentList(type, refreshToken);
  const resultsRef = useRef<HTMLElement | null>(null);
  const [target, setTarget] = useState<DocumentRowVm | null>(null);
  const [deleteState, setDeleteState] = useState<DocumentDeleteState>(IDLE);
  // The button that opened the dialog, and whether the dialog is closing because the document
  // was deleted (its button is gone then, so focus goes to the results region).
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const deletedRef = useRef(false);

  const firstLoad = status === "loading" && !refreshing;
  const count = firstLoad || status === "error" ? null : rows.length;

  const handleRetry = () => {
    retry();
    resultsRef.current?.focus();
  };

  const handleOpenDelete = (row: DocumentRowVm, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    deletedRef.current = false;
    setDeleteState(IDLE);
    setTarget(row);
  };

  const handleConfirm = () => {
    if (target === null || deleteState.status === "deleting") return;
    setDeleteState({ status: "deleting" });
    remove(target.id).then(
      () => {
        deletedRef.current = true;
        setTarget(null);
        setDeleteState(IDLE);
      },
      (error: unknown) => {
        setDeleteState({
          status: "error",
          message: deleteErrorMessage(
            error instanceof HttpError ? error.code : "INTERNAL_ERROR",
          ),
        });
      },
    );
  };

  const handleCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    if (deletedRef.current) {
      resultsRef.current?.focus();
    } else {
      openerRef.current?.focus();
    }
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
      onDelete={handleOpenDelete}
      deleteDialog={
        <DocumentDeleteDialog
          row={target}
          state={deleteState}
          onConfirm={handleConfirm}
          onClose={() => setTarget(null)}
          onCloseAutoFocus={handleCloseAutoFocus}
        />
      }
    />
  );
}
