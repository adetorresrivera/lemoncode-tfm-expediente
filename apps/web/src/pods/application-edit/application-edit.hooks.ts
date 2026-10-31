import {
  applicationInputSchema,
  type Application,
  type ApplicationInput,
} from "@tfm/contracts";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import { HttpError } from "@/core/http/http-client";
import {
  mapFormValuesToApiInput,
  mapServerErrorToFields,
  validateApplicationForm,
} from "./application-edit.mapper";
import type { ApplicationFormValues, FormMessage } from "./application-edit.vm";

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
