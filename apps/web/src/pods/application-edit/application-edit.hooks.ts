import {
  applicationInputSchema,
  type Application,
  type ApplicationInput,
} from "@tfm/contracts";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useEffect, useRef, useState } from "react";
import { HttpError, type HttpErrorCode } from "@/core/http/http-client";
import { extractOffer, getApplication } from "./api/api";
import {
  mapApplicationFromApiToFormValues,
  mapFormValuesToApiInput,
  mapServerErrorToFields,
  mergeExtractionIntoForm,
  validateApplicationForm,
} from "./application-edit.mapper";
import type {
  AiFillableField,
  ApplicationEditSummary,
  ApplicationFormValues,
  ExtractionMerge,
  FormMessage,
  OfferAnalysisStatus,
  OfferErrorReason,
} from "./application-edit.vm";

const INVALID_SUBMIT_MESSAGE = "Revisa los campos marcados.";
const NETWORK_MESSAGE =
  "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.";
const SAVE_ERROR_MESSAGE =
  "No se pudo guardar la candidatura. Inténtalo de nuevo.";

// Waits one frame so React has rendered `aria-invalid` on the controls the validators just marked.
const focusFirstInvalidControl = () => {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
};

interface Options {
  initialValues: ApplicationFormValues;
  save: (input: ApplicationInput) => Promise<Application>;
  onSaved: (application: Application) => void;
}

// Errors appear on the first submit and then update while typing (`revalidateLogic`). The
// validators read the form values (strings), so the contracts schema runs through
// `validateApplicationForm`. The save happens in `onSubmitAsync` so a server 400 can come back as
// field errors in the same channel as the client ones.
export function useApplicationForm({ initialValues, save, onSaved }: Options) {
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const savingRef = useRef(false);

  const form = useForm({
    defaultValues: initialValues,
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onDynamic: ({ value }) => validateApplicationForm(value),
      onSubmitAsync: async ({ value }) => {
        // A second submit while one is in flight must not send a second request.
        if (savingRef.current) return undefined;
        const parsed = applicationInputSchema.safeParse(
          mapFormValuesToApiInput(value),
        );
        if (!parsed.success) {
          setFormMessage({ kind: "error", message: SAVE_ERROR_MESSAGE });
          return undefined;
        }
        savingRef.current = true;
        setFormMessage(null);
        try {
          const application = await save(parsed.data);
          onSaved(application);
          return undefined;
        } catch (error) {
          if (error instanceof HttpError && error.status === 400) {
            const fields = mapServerErrorToFields(error.details);
            if (Object.keys(fields).length > 0) {
              focusFirstInvalidControl();
              return { fields };
            }
          }
          setFormMessage({
            kind: "error",
            message:
              error instanceof HttpError && error.code === "NETWORK_ERROR"
                ? NETWORK_MESSAGE
                : SAVE_ERROR_MESSAGE,
          });
          return undefined;
        } finally {
          savingRef.current = false;
        }
      },
    },
    onSubmitInvalid: () => {
      setFormMessage({ kind: "error", message: INVALID_SUBMIT_MESSAGE });
      focusFirstInvalidControl();
    },
  });

  return { form, formMessage };
}

export type ApplicationFormApi = ReturnType<typeof useApplicationForm>["form"];

const errorReasonOf = (error: unknown): OfferErrorReason => {
  if (error instanceof HttpError) {
    if (error.code === "LLM_TIMEOUT") return "timeout";
    if (error.code === "LLM_ERROR") return "model";
  }
  return "network";
};

interface OfferExtractionOptions {
  form: ApplicationFormApi;
  initialDraft: string;
  onMerged?: (merge: ExtractionMerge) => void;
}

// State of the «Pegar oferta» panel. The draft text lives here, not in the textarea, so closing
// and re-opening the panel keeps it. The merge reads the form values when the response arrives
// (not when the request left), so what the user typed during the wait is kept (D-20). Fields are
// written without running their listeners: an AI fill is not a user edit.
export function useOfferExtraction({
  form,
  initialDraft,
  onMerged,
}: OfferExtractionOptions) {
  const [draft, setDraft] = useState(initialDraft);
  const [status, setStatus] = useState<OfferAnalysisStatus>({ kind: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  // Leaving the page aborts the request silently: no state is written afterwards.
  useEffect(
    () => () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  // One explicit call per field: TypeScript cannot correlate a union key with its value type.
  const applyField = (
    field: AiFillableField,
    values: ApplicationFormValues,
  ): void => {
    const options = { dontRunListeners: true };
    switch (field) {
      case "title":
        form.setFieldValue("title", values.title, options);
        break;
      case "company":
        form.setFieldValue("company", values.company, options);
        break;
      case "location":
        form.setFieldValue("location", values.location, options);
        break;
      case "workMode":
        form.setFieldValue("workMode", values.workMode, options);
        break;
      case "seniority":
        form.setFieldValue("seniority", values.seniority, options);
        break;
      case "contractType":
        form.setFieldValue("contractType", values.contractType, options);
        break;
      case "salaryMin":
        form.setFieldValue("salaryMin", values.salaryMin, options);
        break;
      case "salaryMax":
        form.setFieldValue("salaryMax", values.salaryMax, options);
        break;
      case "currency":
        form.setFieldValue("currency", values.currency, options);
        break;
    }
  };

  const analyze = (): void => {
    if (controllerRef.current !== null) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus({ kind: "analysing" });

    extractOffer(draft.trim(), controller.signal)
      .then((extraction) => {
        if (controller.signal.aborted) return;
        const merge = mergeExtractionIntoForm(form.state.values, extraction);
        for (const field of merge.aiFields) applyField(field, merge.values);
        onMerged?.(merge);
        setStatus({ kind: "success", filled: merge.aiFields.length });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatus({ kind: "error", reason: errorReasonOf(error) });
      })
      .finally(() => {
        if (controllerRef.current === controller) controllerRef.current = null;
      });
  };

  return { draft, setDraft, status, analyze };
}

type LoadOk = {
  key: string;
  outcome: "ok";
  values: ApplicationFormValues;
  summary: ApplicationEditSummary;
};

type LoadResult =
  | LoadOk
  | { key: string; outcome: "notFound" }
  | { key: string; outcome: "error"; code: HttpErrorCode };

export interface ApplicationEditLoad {
  status: "loading" | "ok" | "notFound" | "error";
  values: ApplicationFormValues | null;
  summary: ApplicationEditSummary | null;
  errorCode: HttpErrorCode | null;
  retry: () => void;
}

// Keyed-result pattern (as the detail hook): the key is the id plus the retry attempt, loading is
// derived and an aborted request never writes state, so the form can never be shown prefilled
// with data of another application or with partial data.
export const useApplicationEditLoad = (
  applicationId: string,
): ApplicationEditLoad => {
  const [result, setResult] = useState<LoadResult | null>(null);
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
          values: mapApplicationFromApiToFormValues(application),
          summary: {
            title: application.title,
            company: application.company,
            status: application.status,
            appliedAt: application.appliedAt,
          },
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
    values: current?.outcome === "ok" ? current.values : null,
    summary: current?.outcome === "ok" ? current.summary : null,
    errorCode: current?.outcome === "error" ? current.code : null,
    retry: () => setAttempt((n) => n + 1),
  };
};
