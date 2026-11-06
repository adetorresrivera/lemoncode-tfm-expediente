import { interviewInputSchema, type ApplicationStatus } from "@tfm/contracts";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useEffect, useRef, useState } from "react";
import { STATUS_LABELS } from "@/common/lib/enum-labels";
import { formatDate } from "@/common/lib/format";
import { HttpError, type HttpErrorCode } from "@/core/http/http-client";
import {
  createInterview,
  deleteApplication,
  deleteInterview,
  getApplication,
  getDocument,
  patchApplicationStatus,
  updateInterview,
} from "./api/api";
import {
  mapApplicationFromApiToDetailVm,
  mapDocumentFromApiToDetailVm,
  mapInterviewFormToApiInput,
  validateInterviewForm,
  withOptimisticStatus,
} from "./application-detail.mapper";
import type {
  ApplicationDetailVm,
  DeleteState,
  DetailDocumentSlotVm,
  DetailDocumentVm,
  DetailDocumentsVm,
  InterviewActions,
  InterviewFormMode,
  InterviewFormValues,
  StatusFeedback,
} from "./application-detail.vm";

type OkResult = { key: string; outcome: "ok"; vm: ApplicationDetailVm };

type Result =
  | OkResult
  | { key: string; outcome: "notFound" }
  | { key: string; outcome: "error"; code: HttpErrorCode };

// Status-change state. It is stored per application key (see `mutations`), so a request that
// settles late can only write its own slot and never the one of the application on screen.
interface Mutation {
  pendingStatus: ApplicationStatus | null;
  feedback: StatusFeedback | null;
}

// The outcome of the document requests of one application, tagged with the key they were sent for.
interface DocumentsResult {
  key: string;
  slots: DetailDocumentsVm;
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
  remove: () => void;
  // Clears a failed delete so the confirmation reopens clean; never hides a request in flight.
  resetDeleteError: () => void;
  deleteState: DeleteState;
  interviewActions: InterviewActions;
  documents: DetailDocumentsVm;
}

interface Options {
  // The pod reports the delete; the scene decides where to go next.
  onDeleted: () => void;
}

// Keyed-result pattern (as the list hook): the key is the id plus the retry attempt, loading is
// derived and an aborted request never writes state, so a fast id change cannot show stale data.
export const useApplicationDetail = (
  applicationId: string,
  { onDeleted }: Options,
): ApplicationDetailState => {
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [documentsResult, setDocumentsResult] =
    useState<DocumentsResult | null>(null);
  const [mutations, setMutations] = useState<Record<string, Mutation>>({});
  const [deletion, setDeletion] = useState<{
    key: string;
    state: "deleting" | "error";
  } | null>(null);
  // The key of the application a mutation is running for: the lock never leaks into another one.
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // Round feedback (the section's polite region), one message per application key.
  const [interviewFeedbacks, setInterviewFeedbacks] = useState<
    Record<string, string>
  >({});
  const busyRef = useRef<string | null>(null);
  const deletingRef = useRef(false);
  const mountedRef = useRef(true);
  // One success timer per application key: two applications never share (or orphan) a timer.
  const successTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );
  const key = `${applicationId}#${attempt}`;
  const busy = busyKey === key;

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

  // The documents are requested once the application is loaded, one request per link, in
  // parallel. The key holds the application, the attempt and both link ids: a mutation that keeps
  // the links keeps the key (no refetch), another application or another link set changes it.
  const loadedLinks =
    result?.key === key && result.outcome === "ok"
      ? result.vm.documentLinks
      : null;
  const cvLink = loadedLinks?.cv ?? null;
  const coverLetterLink = loadedLinks?.coverLetter ?? null;
  const documentsKey = `${key}:${cvLink ?? ""}:${coverLetterLink ?? ""}`;
  const linksLoaded = loadedLinks !== null;

  useEffect(() => {
    if (!linksLoaded || (cvLink === null && coverLetterLink === null)) return;
    const controller = new AbortController();
    const settle = (
      outcome: PromiseSettledResult<DetailDocumentVm | null>,
    ): DetailDocumentSlotVm => {
      if (outcome.status === "rejected") return { kind: "error" };
      return outcome.value === null
        ? { kind: "none" }
        : { kind: "ok", document: outcome.value };
    };
    const load = (id: string | null) =>
      id === null
        ? Promise.resolve(null)
        : getDocument(id, controller.signal).then(mapDocumentFromApiToDetailVm);
    Promise.allSettled([load(cvLink), load(coverLetterLink)]).then(
      ([cv, coverLetter]) => {
        if (controller.signal.aborted) return;
        setDocumentsResult({
          key: documentsKey,
          slots: { cv: settle(cv), coverLetter: settle(coverLetter) },
        });
      },
    );
    return () => controller.abort();
  }, [linksLoaded, cvLink, coverLetterLink, documentsKey]);

  useEffect(() => {
    mountedRef.current = true;
    const timers = successTimersRef.current;
    return () => {
      mountedRef.current = false;
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const current = result?.key === key ? result : null;
  const slotOf = (
    link: string | null,
    slot: keyof DetailDocumentsVm,
  ): DetailDocumentSlotVm => {
    if (link === null) return { kind: "none" };
    return documentsResult?.key === documentsKey
      ? documentsResult.slots[slot]
      : { kind: "loading" };
  };
  const currentMutation = mutations[key] ?? null;

  // Writes only while the result still belongs to the application the request was sent for.
  const replaceResult = (next: OkResult) =>
    setResult((previous) => (previous?.key === next.key ? next : previous));

  // The mutation is never aborted on unmount and nothing is refetched: the PATCH answer is the
  // new truth. One request in flight (busy ref); the snapshot comes from this render's closure.
  // One mutation at a time per application, shared by the status change and the rounds. The ref
  // blocks a second call in the same tick; the state lets the buttons render `aria-disabled`. Both
  // hold the key they were started for, so a mutation that settles after the application changed
  // releases only its own lock.
  const isBusy = () => busyRef.current === key;
  const startBusy = () => {
    busyRef.current = key;
    setBusyKey(key);
  };
  const endBusy = () => {
    if (busyRef.current === key) busyRef.current = null;
    setBusyKey((previous) => (previous === key ? null : previous));
  };

  // Writes the status slot of the application the request was sent for, never another one.
  const writeMutation = (next: Mutation) =>
    setMutations((previous) => ({ ...previous, [key]: next }));

  // Removes the success message (status slot and rounds slot) of the given application key only.
  const dropSuccess = (target: string) => {
    setMutations((previous) => {
      const slot = previous[target];
      return slot?.feedback?.kind === "success"
        ? { ...previous, [target]: { ...slot, feedback: null } }
        : previous;
    });
    setInterviewFeedbacks((previous) => {
      if (!(target in previous)) return previous;
      const rest = { ...previous };
      delete rest[target];
      return rest;
    });
  };

  // Drops this application's pending 5 s timer and its success message.
  const clearSuccess = () => {
    const timer = successTimersRef.current.get(key);
    if (timer !== undefined) {
      clearTimeout(timer);
      successTimersRef.current.delete(key);
    }
    dropSuccess(key);
  };

  // One timer per application key: after SUCCESS_VISIBLE_MS no success message stays on screen,
  // and a later settlement of the same application replaces its timer instead of orphaning it.
  const scheduleSuccessClear = () => {
    // A mutation that settles after unmount must not arm a timer nothing will clear.
    if (!mountedRef.current) return;
    const previous = successTimersRef.current.get(key);
    if (previous !== undefined) clearTimeout(previous);
    successTimersRef.current.set(
      key,
      setTimeout(() => {
        successTimersRef.current.delete(key);
        dropSuccess(key);
      }, SUCCESS_VISIBLE_MS),
    );
  };

  const writeInterviewFeedback = (message: string) =>
    setInterviewFeedbacks((previous) => ({ ...previous, [key]: message }));

  const changeStatus = (next: ApplicationStatus) => {
    if (isBusy() || current?.outcome !== "ok") return;
    if (current.vm.status === next) return;
    startBusy();
    clearSuccess();
    const snapshot = current;
    replaceResult({
      ...snapshot,
      vm: withOptimisticStatus(
        snapshot.vm,
        next,
        formatDate(new Date().toISOString()),
      ),
    });
    writeMutation({
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
        writeMutation({
          pendingStatus: null,
          feedback: {
            kind: "success",
            message: `Estado cambiado a ${STATUS_LABELS[next]}.`,
          },
        });
        scheduleSuccessClear();
      })
      .catch(() => {
        replaceResult(snapshot);
        writeMutation({
          pendingStatus: null,
          feedback: { kind: "error", message: STATUS_ERROR_MESSAGE },
        });
      })
      .finally(endBusy);
  };

  // The POST answer is the new truth: nothing is shown before the server confirms (D-13). Rejects
  // without a request when another mutation is running, the result is not loaded or the values do
  // not parse; rejects after releasing the busy guard when the request fails, so the dialog can
  // stay open with its own error. The status move is read from the response, never guessed.
  const addInterview = async (values: InterviewFormValues): Promise<void> => {
    if (isBusy() || current?.outcome !== "ok") {
      throw new Error("Interview not added: another change is in progress");
    }
    const parsed = interviewInputSchema.safeParse(
      mapInterviewFormToApiInput(values),
    );
    if (!parsed.success) throw new Error("Interview not added: invalid values");
    startBusy();
    clearSuccess();
    const snapshot = current;
    try {
      const application = await createInterview(applicationId, parsed.data);
      replaceResult({
        key,
        outcome: "ok",
        vm: mapApplicationFromApiToDetailVm(application),
      });
      const moved =
        snapshot.vm.status !== application.status &&
        application.status === "en_entrevistas";
      writeInterviewFeedback(
        moved
          ? `Ronda añadida. Estado cambiado a ${STATUS_LABELS.en_entrevistas}.`
          : "Ronda añadida.",
      );
      scheduleSuccessClear();
    } finally {
      endBusy();
    }
  };

  // Same contract as `addInterview` for the PUT of one round. The hook never derives a round
  // number: an empty «Ronda» is rejected here and the edit form already blocks it (D-28).
  const updateRound = async (
    interviewId: string,
    values: InterviewFormValues,
  ): Promise<void> => {
    if (isBusy() || current?.outcome !== "ok") {
      throw new Error("Interview not updated: another change is in progress");
    }
    if (values.round.trim() === "") {
      throw new Error("Interview not updated: the round is required");
    }
    // The stored date goes back as it is while the date control was not touched (it only holds
    // minutes in local time).
    const stored = current.vm.interviews.find(
      (interview) => interview.id === interviewId,
    );
    const parsed = interviewInputSchema.safeParse(
      mapInterviewFormToApiInput(
        values,
        stored === undefined
          ? undefined
          : {
              local: stored.editValues.scheduledAt,
              iso: stored.scheduledAt,
            },
      ),
    );
    if (!parsed.success) {
      throw new Error("Interview not updated: invalid values");
    }
    startBusy();
    clearSuccess();
    try {
      const application = await updateInterview(
        applicationId,
        interviewId,
        parsed.data,
      );
      replaceResult({
        key,
        outcome: "ok",
        vm: mapApplicationFromApiToDetailVm(application),
      });
      writeInterviewFeedback("Ronda actualizada.");
      scheduleSuccessClear();
    } finally {
      endBusy();
    }
  };

  // Same contract for the DELETE of one round: the answer replaces the view, the other rounds keep
  // their numbers and the status is whatever the server returns (D-08).
  const removeRound = async (interviewId: string): Promise<void> => {
    if (isBusy() || current?.outcome !== "ok") {
      throw new Error("Interview not deleted: another change is in progress");
    }
    startBusy();
    clearSuccess();
    try {
      const application = await deleteInterview(applicationId, interviewId);
      replaceResult({
        key,
        outcome: "ok",
        vm: mapApplicationFromApiToDetailVm(application),
      });
      writeInterviewFeedback("Ronda eliminada.");
      scheduleSuccessClear();
    } finally {
      endBusy();
    }
  };

  // One DELETE in flight. After a success the ref stays set: the scene is about to leave.
  const remove = () => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeletion({ key, state: "deleting" });
    deleteApplication(applicationId).then(
      () => onDeleted(),
      () => {
        deletingRef.current = false;
        setDeletion({ key, state: "error" });
      },
    );
  };

  const resetDeleteError = () =>
    setDeletion((current) => (current?.state === "error" ? null : current));

  return {
    status: current === null ? "loading" : current.outcome,
    vm: current?.outcome === "ok" ? current.vm : null,
    errorCode: current?.outcome === "error" ? current.code : null,
    retry: () => setAttempt((n) => n + 1),
    changeStatus,
    pendingStatus: currentMutation?.pendingStatus ?? null,
    statusFeedback: currentMutation?.feedback ?? null,
    remove,
    resetDeleteError,
    deleteState: deletion?.key === key ? deletion.state : "idle",
    interviewActions: {
      busy,
      feedback: interviewFeedbacks[key] ?? null,
      add: addInterview,
      update: updateRound,
      remove: removeRound,
    },
    documents: {
      cv: slotOf(cvLink, "cv"),
      coverLetter: slotOf(coverLetterLink, "coverLetter"),
    },
  };
};

interface InterviewFormOptions {
  initialValues: InterviewFormValues;
  mode: InterviewFormMode;
  onSave: (values: InterviewFormValues) => Promise<void>;
  onInvalid: () => void;
}

// Form state of the round dialog. It is created inside the dialog content, so every opening
// starts from the defaults. Errors show on the first submit and then update while typing. A save
// that rejects keeps the typed values and raises `saveFailed`; the next valid submit clears it.
export function useInterviewForm({
  initialValues,
  mode,
  onSave,
  onInvalid,
}: InterviewFormOptions) {
  const [saveFailed, setSaveFailed] = useState(false);

  const form = useForm({
    defaultValues: initialValues,
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onDynamic: ({ value }) => validateInterviewForm(value, mode),
    },
    onSubmit: async ({ value }) => {
      setSaveFailed(false);
      try {
        await onSave(value);
      } catch {
        setSaveFailed(true);
      }
    },
    onSubmitInvalid: onInvalid,
  });

  return { form, saveFailed };
}

export type InterviewFormApi = ReturnType<typeof useInterviewForm>["form"];
