import { RequestStatus } from "@/common/components/request-status";
import { Button } from "@/common/components/ui/button";
import type { ApplicationFormApi } from "./application-edit.hooks";
import type { FormMessage, RenderCancelLink } from "./application-edit.vm";
import { ConditionsSection } from "./components/conditions-section";
import { JobSection } from "./components/job-section";
import { TrackingSection } from "./components/tracking-section";

interface Props {
  form: ApplicationFormApi;
  formMessage: FormMessage | null;
  renderCancelLink: RenderCancelLink;
}

export function ApplicationEditComponent({
  form,
  formMessage,
  renderCancelLink,
}: Props) {
  return (
    <form
      noValidate
      className="flex max-w-3xl flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        // The button is aria-disabled, not disabled, so it can still be clicked while saving.
        if (form.state.isSubmitting) return;
        void form.handleSubmit();
      }}
    >
      <p className="text-sm font-semibold text-muted-foreground">
        Los campos con * son obligatorios.
      </p>
      <JobSection form={form} />
      <ConditionsSection form={form} />
      <TrackingSection form={form} mode="create" />
      <div role="status" aria-live="polite">
        {formMessage ? (
          <RequestStatus
            kind={formMessage.kind}
            message={formMessage.message}
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              aria-disabled={isSubmitting}
              className="h-11 w-full sm:w-auto"
            >
              {isSubmitting ? "Guardando…" : "Guardar candidatura"}
            </Button>
          )}
        </form.Subscribe>
        <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
          {renderCancelLink({ children: "Descartar cambios" })}
        </Button>
      </div>
    </form>
  );
}
