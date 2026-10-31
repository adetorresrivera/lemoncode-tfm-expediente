import { useEffect, useRef, useState } from "react";
import { HttpError, type HttpErrorCode } from "@/core/http/http-client";
import type { ListSearch } from "@/core/router/application-search";
import { buildApplicationsQuery, getApplications, getTags } from "./api/api";
import {
  mapApplicationListFromApiToVm,
  mapStackTagsFromApiToVm,
} from "./application-list.mapper";
import type {
  ApplicationListItem,
  StackTagOptionVm,
} from "./application-list.vm";

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

// Keyed-result pattern: the key is the API query string plus the retry attempt. Loading is
// derived (the stored result belongs to another key), so no setState runs in the effect body.
// A query change or a retry changes the key, aborts the previous request and only a response
// that still belongs to the current key can be rendered.
export const useApplicationList = (query: ListSearch): ApplicationListState => {
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const queryString = buildApplicationsQuery(query);
  const key = `${queryString}#${attempt}`;

  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  });

  useEffect(() => {
    const controller = new AbortController();
    getApplications(queryRef.current, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          outcome: "ok",
          applications: mapApplicationListFromApiToVm(data),
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

  return {
    status: current === null ? "loading" : current.outcome,
    applications: result?.outcome === "ok" ? result.applications : [],
    errorCode: current?.outcome === "error" ? current.code : null,
    refreshing: current === null && lastWasOk,
    retry: () => setAttempt((n) => n + 1),
  };
};

type StackTagsResult =
  | { attempt: number; outcome: "ok"; options: StackTagOptionVm[] }
  | { attempt: number; outcome: "error" };

export interface StackTagsState {
  status: "loading" | "ok" | "error";
  options: StackTagOptionVm[];
  retry: () => void;
}

// Same keyed-result pattern as the list: loading is derived (the stored result belongs to an
// older attempt), the mapper runs on receipt and an aborted request never writes state.
export const useStackTags = (): StackTagsState => {
  const [result, setResult] = useState<StackTagsResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getTags(controller.signal)
      .then((tags) => {
        if (controller.signal.aborted) return;
        setResult({
          attempt,
          outcome: "ok",
          options: mapStackTagsFromApiToVm(tags),
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResult({ attempt, outcome: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  const current = result?.attempt === attempt ? result : null;

  return {
    status: current === null ? "loading" : current.outcome,
    options: current?.outcome === "ok" ? current.options : [],
    retry: () => setAttempt((n) => n + 1),
  };
};
