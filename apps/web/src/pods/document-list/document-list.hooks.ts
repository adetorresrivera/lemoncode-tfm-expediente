import type { DocumentType } from "@tfm/contracts";
import { useEffect, useRef, useState } from "react";
import { HttpError, type HttpErrorCode } from "@/core/http/http-client";
import { deleteDocument, getDocumentList } from "./api/api";
import { mapDocumentListFromApiToVm } from "./document-list.mapper";
import type { DocumentRowVm } from "./document-list.vm";

const DELETED_MESSAGE = "Documento eliminado.";
const FEEDBACK_VISIBLE_MS = 5000;

type Result =
  | { key: string; outcome: "ok"; rows: DocumentRowVm[] }
  | { key: string; outcome: "error"; code: HttpErrorCode };

export interface DocumentListState {
  status: "loading" | "ok" | "error";
  rows: DocumentRowVm[];
  errorCode: HttpErrorCode | null;
  refreshing: boolean;
  retry: () => void;
  remove: (id: string) => Promise<void>;
  feedback: string | null;
}

// Keyed-result pattern of the application list: the key is the filter, the retry attempt and the
// scene's refresh signal. Loading is derived (the stored result belongs to another key), so no
// setState runs in the effect body; a change of key aborts the previous request and only a
// response that still belongs to the current key can be rendered. A key change while the
// previous result was ok keeps those rows on screen (`refreshing`) instead of flashing a skeleton.
export const useDocumentList = (
  type: DocumentType | undefined,
  refreshToken: number,
): DocumentListState => {
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${type ?? ""}#${attempt}#${refreshToken}`;

  // An object per deletion so a second one restarts the timer.
  const [deleted, setDeleted] = useState<object | null>(null);

  const typeRef = useRef(type);
  const keyRef = useRef(key);
  useEffect(() => {
    typeRef.current = type;
    keyRef.current = key;
  });

  useEffect(() => {
    if (deleted === null) return undefined;
    const timer = setTimeout(() => setDeleted(null), FEEDBACK_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [deleted]);

  useEffect(() => {
    const controller = new AbortController();
    getDocumentList(typeRef.current, controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          outcome: "ok",
          rows: mapDocumentListFromApiToVm(items),
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          outcome: "error",
          code: error instanceof HttpError ? error.code : "INTERNAL_ERROR",
        });
      });
    return () => controller.abort();
  }, [key]);

  const current = result?.key === key ? result : null;
  const lastWasOk = result?.outcome === "ok";

  // The response is the truth (D-29): the row leaves the current result only after the API
  // answered 204, never before and never through a refetch. A refusal or any failure rejects, so
  // the caller shows it where the user tried to delete.
  const remove = async (id: string): Promise<void> => {
    await deleteDocument(id);
    setResult((previous) =>
      previous !== null &&
      previous.outcome === "ok" &&
      previous.key === keyRef.current
        ? { ...previous, rows: previous.rows.filter((row) => row.id !== id) }
        : previous,
    );
    setDeleted({});
  };

  return {
    status: current === null ? "loading" : current.outcome,
    rows: result?.outcome === "ok" ? result.rows : [],
    errorCode: current?.outcome === "error" ? current.code : null,
    refreshing: current === null && lastWasOk,
    retry: () => setAttempt((n) => n + 1),
    remove,
    feedback: deleted === null ? null : DELETED_MESSAGE,
  };
};
