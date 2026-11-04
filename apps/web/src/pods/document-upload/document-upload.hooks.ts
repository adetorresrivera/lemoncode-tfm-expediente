import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useCallback, useEffect, useRef } from "react";
import { uploadDocument } from "./api/api";
import {
  mapUploadedDocumentFromApiToVm,
  mapUploadErrorToFeedback,
  mapUploadFormToRequest,
  validateUploadForm,
} from "./document-upload.mapper";
import type {
  UploadedDocumentVm,
  UploadFormValues,
} from "./document-upload.vm";

const isAbortError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  error.name === "AbortError";

// One request at a time: `cancel` aborts the one in flight. A request that outlives the dialog
// (Pitfall 8) may still end stored on the server; nothing is rolled back from here.
export function useDocumentUpload() {
  const controllerRef = useRef<AbortController | null>(null);

  const upload = useCallback(
    async (values: UploadFormValues): Promise<UploadedDocumentVm> => {
      const request = mapUploadFormToRequest(values);
      if (request === null) throw new Error("A file is required");
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        const document = await uploadDocument(request, controller.signal);
        return mapUploadedDocumentFromApiToVm(document);
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return { upload, cancel };
}

// What the container reacts to; the form supplies the rest.
export interface UploadFormHandlers {
  upload: (values: UploadFormValues) => Promise<UploadedDocumentVm>;
  onUploaded: (uploaded: UploadedDocumentVm) => void;
  onStart: () => void;
  onCancelled: () => void;
  onFailed: (message: string) => void;
  // Runs last on every outcome of an upload that started.
  onSettled: () => void;
}

interface UploadFormOptions extends UploadFormHandlers {
  initialValues: UploadFormValues;
  // Client validation failed or the server named a field: focus the first invalid control.
  onInvalid: () => void;
}

// Errors appear on the first submit and then update while typing (`revalidateLogic`). The upload
// runs inside `onSubmitAsync` so a server 413, 415 or 400 comes back as field errors in the same
// channel as the client ones; the async validator never runs when the client validation failed.
export function useUploadForm({
  initialValues,
  upload,
  onUploaded,
  onInvalid,
  onStart,
  onCancelled,
  onFailed,
  onSettled,
}: UploadFormOptions) {
  const uploadingRef = useRef(false);

  const form = useForm({
    defaultValues: initialValues,
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onDynamic: ({ value }) => validateUploadForm(value),
      onSubmitAsync: async ({ value }) => {
        // A second submit while one is in flight must not send a second request.
        if (uploadingRef.current) return undefined;
        uploadingRef.current = true;
        onStart();
        try {
          const uploaded = await upload(value);
          onUploaded(uploaded);
          return undefined;
        } catch (error) {
          if (isAbortError(error)) {
            onCancelled();
            return undefined;
          }
          const feedback = mapUploadErrorToFeedback(error);
          if ("fields" in feedback) {
            onInvalid();
            return { fields: feedback.fields };
          }
          onFailed(feedback.message);
          return undefined;
        } finally {
          uploadingRef.current = false;
          onSettled();
        }
      },
    },
    onSubmitInvalid: onInvalid,
  });

  return { form };
}

export type UploadFormApi = ReturnType<typeof useUploadForm>["form"];
