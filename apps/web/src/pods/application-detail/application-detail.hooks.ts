import { useEffect, useState } from "react";
import { HttpError, type HttpErrorCode } from "@/core/http/http-client";
import { getApplication } from "./api/api";
import { mapApplicationFromApiToDetailVm } from "./application-detail.mapper";
import type { ApplicationDetailVm } from "./application-detail.vm";

type Result =
  | { key: string; outcome: "ok"; vm: ApplicationDetailVm }
  | { key: string; outcome: "notFound" }
  | { key: string; outcome: "error"; code: HttpErrorCode };

export interface ApplicationDetailState {
  status: "loading" | "ok" | "notFound" | "error";
  vm: ApplicationDetailVm | null;
  errorCode: HttpErrorCode | null;
  retry: () => void;
}

// Keyed-result pattern (as the list hook): the key is the id plus the retry attempt, loading is
// derived and an aborted request never writes state, so a fast id change cannot show stale data.
export const useApplicationDetail = (
  applicationId: string,
): ApplicationDetailState => {
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${applicationId}#${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    getApplication(applicationId, controller.signal)
      .then((application) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          outcome: "ok",
          vm: mapApplicationFromApiToDetailVm(application),
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof HttpError && error.code === "NOT_FOUND") {
          setResult({ key, outcome: "notFound" });
          return;
        }
        setResult({
          key,
          outcome: "error",
          code: error instanceof HttpError ? error.code : "INTERNAL_ERROR",
        });
      });
    return () => controller.abort();
  }, [applicationId, key]);

  const current = result?.key === key ? result : null;

  return {
    status: current === null ? "loading" : current.outcome,
    vm: current?.outcome === "ok" ? current.vm : null,
    errorCode: current?.outcome === "error" ? current.code : null,
    retry: () => setAttempt((n) => n + 1),
  };
};
