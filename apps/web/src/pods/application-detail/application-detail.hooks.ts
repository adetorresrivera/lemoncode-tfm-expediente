import type { ApplicationStatus } from "@tfm/contracts";
import { useEffect, useRef, useState } from "react";
import { STATUS_LABELS } from "@/common/lib/enum-labels";
import { formatDate } from "@/common/lib/format";
import { HttpError, type HttpErrorCode } from "@/core/http/http-client";
import { getApplication, patchApplicationStatus } from "./api/api";
import {
  mapApplicationFromApiToDetailVm,
  withOptimisticStatus,
} from "./application-detail.mapper";
import type {
  ApplicationDetailVm,
  StatusFeedback,
} from "./application-detail.vm";

type OkResult = { key: string; outcome: "ok"; vm: ApplicationDetailVm };

type Result =
  | OkResult
  | { key: string; outcome: "notFound" }
  | { key: string; outcome: "error"; code: HttpErrorCode };

// Status-change state, keyed like the result so it never leaks into another application.
interface Mutation {
  key: string;
  pendingStatus: ApplicationStatus | null;
  feedback: StatusFeedback | null;
}

const SUCCESS_VISIBLE_MS = 5000;
const STATUS_ERROR_MESSAGE =
  "No se pudo cambiar el estado. Inténtalo de nuevo.";

export interface ApplicationDetailState {
  status: "loading" | "ok" | "notFound" | "error";
  vm: ApplicationDetailVm | null;
  errorCode: HttpErrorCode | null;
  retry: () => void;
  changeStatus: (next: ApplicationStatus) => void;
  pendingStatus: ApplicationStatus | null;
  statusFeedback: StatusFeedback | null;
}

// Keyed-result pattern (as the list hook): the key is the id plus the retry attempt, loading is
// derived and an aborted request never writes state, so a fast id change cannot show stale data.
export const useApplicationDetail = (
  applicationId: string,
): ApplicationDetailState => {
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [mutation, setMutation] = useState<Mutation | null>(null);
  const busyRef = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(
    () => () => {
      if (successTimerRef.current !== null) {
        clearTimeout(successTimerRef.current);
      }
    },
    [],
  );

  const current = result?.key === key ? result : null;
  const currentMutation = mutation?.key === key ? mutation : null;

  // Writes only while the result still belongs to the application the request was sent for.
  const replaceResult = (next: OkResult) =>
    setResult((previous) => (previous?.key === next.key ? next : previous));

  // The mutation is never aborted on unmount and nothing is refetched: the PATCH answer is the
  // new truth. One request in flight (busy ref); the snapshot comes from this render's closure.
  const changeStatus = (next: ApplicationStatus) => {
    if (busyRef.current || current?.outcome !== "ok") return;
    if (current.vm.status === next) return;
    busyRef.current = true;
    if (successTimerRef.current !== null) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    const snapshot = current;
    replaceResult({
      ...snapshot,
      vm: withOptimisticStatus(
        snapshot.vm,
        next,
        formatDate(new Date().toISOString()),
      ),
    });
    setMutation({
      key,
      pendingStatus: next,
      feedback: { kind: "loading", message: "Guardando…" },
    });
    patchApplicationStatus(applicationId, next)
      .then((application) => {
        replaceResult({
          key,
          outcome: "ok",
          vm: mapApplicationFromApiToDetailVm(application),
        });
        setMutation({
          key,
          pendingStatus: null,
          feedback: {
            kind: "success",
            message: `Estado cambiado a ${STATUS_LABELS[next]}.`,
          },
        });
        successTimerRef.current = setTimeout(() => {
          successTimerRef.current = null;
          setMutation((previous) =>
            previous?.feedback?.kind === "success"
              ? { ...previous, feedback: null }
              : previous,
          );
        }, SUCCESS_VISIBLE_MS);
      })
      .catch(() => {
        replaceResult(snapshot);
        setMutation({
          key,
          pendingStatus: null,
          feedback: { kind: "error", message: STATUS_ERROR_MESSAGE },
        });
      })
      .finally(() => {
        busyRef.current = false;
      });
  };

  return {
    status: current === null ? "loading" : current.outcome,
    vm: current?.outcome === "ok" ? current.vm : null,
    errorCode: current?.outcome === "error" ? current.code : null,
    retry: () => setAttempt((n) => n + 1),
    changeStatus,
    pendingStatus: currentMutation?.pendingStatus ?? null,
    statusFeedback: currentMutation?.feedback ?? null,
  };
};
