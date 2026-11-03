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
  patchApplicationStatus,
  updateInterview,
} from "./api/api";
import {
  mapApplicationFromApiToDetailVm,
  mapInterviewFormToApiInput,
  validateInterviewForm,
  withOptimisticStatus,
} from "./application-detail.mapper";
import type {
  ApplicationDetailVm,
  DeleteState,
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

// Status-change state, keyed like the result so it never leaks into another application.
interface Mutation {
  key: string;
  pendingStatus: ApplicationStatus | null;
  feedback: StatusFeedback | null;
}

// Round feedback lives in its own slot (the section's polite region), keyed like the result.
interface InterviewFeedback {
  key: string;
  message: string;
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
  deleteState: DeleteState;
  interviewActions: InterviewActions;
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
  const [mutation, setMutation] = useState<Mutation | null>(null);
  const [deletion, setDeletion] = useState<{
    key: string;
    state: "deleting" | "error";
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [interviewFeedback, setInterviewFeedback] =
    useState<InterviewFeedback | null>(null);
  const busyRef = useRef(false);
  const deletingRef = useRef(false);
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
  // One mutation at a time, shared by the status change and the rounds. The ref blocks a second
  // call in the same tick; the state lets the buttons render `aria-disabled`.
  const startBusy = () => {
    busyRef.current = true;
    setBusy(true);
  };
  const endBusy = () => {
    busyRef.current = false;
    setBusy(false);
  };

  // Drops the pending 5 s timer and any success message (status slot and rounds slot).
  const clearSuccess = () => {
    if (successTimerRef.current !== null) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setMutation((previous) =>
      previous?.feedback?.kind === "success"
        ? { ...previous, feedback: null }
        : previous,
    );
    setInterviewFeedback(null);
  };

  // One timer for both slots: after SUCCESS_VISIBLE_MS no success message stays on screen.
  const scheduleSuccessClear = () => {
    successTimerRef.current = setTimeout(() => {
      successTimerRef.current = null;
      setMutation((previous) =>
        previous?.feedback?.kind === "success"
          ? { ...previous, feedback: null }
          : previous,
      );
      setInterviewFeedback(null);
    }, SUCCESS_VISIBLE_MS);
  };

  const changeStatus = (next: ApplicationStatus) => {
    if (busyRef.current || current?.outcome !== "ok") return;
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
        scheduleSuccessClear();
      })
      .catch(() => {
        replaceResult(snapshot);
        setMutation({
          key,
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
    if (busyRef.current || current?.outcome !== "ok") {
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
      setInterviewFeedback({
        key,
        message: moved
          ? `Ronda añadida. Estado cambiado a ${STATUS_LABELS.en_entrevistas}.`
          : "Ronda añadida.",
      });
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
    if (busyRef.current || current?.outcome !== "ok") {
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
      setInterviewFeedback({ key, message: "Ronda actualizada." });
      scheduleSuccessClear();
    } finally {
      endBusy();
    }
  };

  // Same contract for the DELETE of one round: the answer replaces the view, the other rounds keep
  // their numbers and the status is whatever the server returns (D-08).
  const removeRound = async (interviewId: string): Promise<void> => {
    if (busyRef.current || current?.outcome !== "ok") {
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
      setInterviewFeedback({ key, message: "Ronda eliminada." });
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

  return {
    status: current === null ? "loading" : current.outcome,
    vm: current?.outcome === "ok" ? current.vm : null,
    errorCode: current?.outcome === "error" ? current.code : null,
    retry: () => setAttempt((n) => n + 1),
    changeStatus,
    pendingStatus: currentMutation?.pendingStatus ?? null,
    statusFeedback: currentMutation?.feedback ?? null,
    remove,
    deleteState: deletion?.key === key ? deletion.state : "idle",
    interviewActions: {
      busy,
      feedback:
        interviewFeedback?.key === key ? interviewFeedback.message : null,
      add: addInterview,
      update: updateRound,
      remove: removeRound,
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
