import { useId } from "react";
import type { ApplicationFormApi } from "../application-edit.hooks";
import type { RenderDocumentPicker } from "../application-edit.vm";
import { firstFieldError } from "./field-props";

interface Props {
  form: ApplicationFormApi;
  renderDocumentPicker: RenderDocumentPicker;
}

// The CV and the cover letter of the application. Both are optional; the pickers come from the
// scene through the slot, so this pod never imports the upload pod (D-14, D-15).
export function DocumentsSection({ form, renderDocumentPicker }: Props) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6"
    >
      <h2
        id={headingId}
        className="font-serif text-base font-semibold leading-[1.2]"
      >
        Documentos
      </h2>
      <p className="text-muted-foreground">
        Opcionales. Elige uno que ya tengas o sube uno nuevo.
      </p>
      <div className="flex flex-col gap-4">
        <form.Field name="cvDocumentId">
          {(field) =>
            renderDocumentPicker({
              type: "cv",
              selectedId: field.state.value,
              onSelected: (id) => field.handleChange(id),
              error: firstFieldError(field.state.meta.errors),
            })
          }
        </form.Field>
        <form.Field name="coverLetterDocumentId">
          {(field) =>
            renderDocumentPicker({
              type: "carta",
              selectedId: field.state.value,
              onSelected: (id) => field.handleChange(id),
              error: firstFieldError(field.state.meta.errors),
            })
          }
        </form.Field>
      </div>
    </section>
  );
}
