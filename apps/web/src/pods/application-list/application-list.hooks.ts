import { useEffect, useState } from "react";
import { HttpError, type HttpErrorCode } from "@/core/http/http-client";
import { getApplications } from "./api/api";
import { mapApplicationListFromApiToVm } from "./application-list.mapper";
import type { ApplicationListItem } from "./application-list.vm";

type Result =
  | { key: string; outcome: "ok"; applications: ApplicationListItem[] }
  | { key: string; outcome: "error"; code: HttpErrorCode };

export interface ApplicationListState {
  status: "loading" | "ok" | "error";
  applications: ApplicationListItem[];
  errorCode: HttpErrorCode | null;
  refreshing: boolean;
  retry: () => void;
}

// Keyed-result pattern: loading is derived (the stored result belongs to another key), so no
// setState runs in the effect body. Every retry changes the key, aborts the previous request and
// only the latest response can be rendered.
export const useApplicationList = (): ApplicationListState => {
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `#${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    getApplications(controller.signal)
      .then((data) =>
        setResult({
          key,
          outcome: "ok",
          applications: mapApplicationListFromApiToVm(data),
        }),
      )
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

  return {
    status: current === null ? "loading" : current.outcome,
    applications: result?.outcome === "ok" ? result.applications : [],
    errorCode: current?.outcome === "error" ? current.code : null,
    refreshing: current === null && lastWasOk,
    retry: () => setAttempt((n) => n + 1),
  };
};
