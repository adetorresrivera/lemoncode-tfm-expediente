import { useId } from "react";
import { Input } from "@/common/components/ui/input";
import type { ApplicationFormApi } from "../application-edit.hooks";
import type { AiMarks } from "../application-edit.vm";
import { controlProps, firstFieldError } from "./field-props";
import { FormField } from "./form-field";

interface Props {
  form: ApplicationFormApi;
  marks?: AiMarks;
}

export function JobSection({ form, marks }: Props) {
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
        Puesto y empresa
      </h2>
      <form.Field name="title">
        {(field) => {
          const error = firstFieldError(field.state.meta.errors);
          const aiFilled = marks?.aiFields.has("title") === true;
          const missing = marks?.missingFields.has("title") === true;
          return (
            <FormField
              id="field-title"
              label="Puesto"
              required
              error={error}
              aiFilled={aiFilled}
              missing={missing}
            >
              <Input
                {...controlProps({
                  id: "field-title",
                  error,
                  required: true,
                  aiFilled,
                  missing,
                })}
                name={field.name}
                value={field.state.value}
                autoComplete="off"
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </FormField>
          );
        }}
      </form.Field>
      <form.Field name="company">
        {(field) => {
          const error = firstFieldError(field.state.meta.errors);
          const aiFilled = marks?.aiFields.has("company") === true;
          const missing = marks?.missingFields.has("company") === true;
          return (
            <FormField
              id="field-company"
              label="Empresa"
              required
              error={error}
              aiFilled={aiFilled}
              missing={missing}
            >
              <Input
                {...controlProps({
                  id: "field-company",
                  error,
                  required: true,
                  aiFilled,
                  missing,
                })}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </FormField>
          );
        }}
      </form.Field>
    </section>
  );
}
