import { useId } from "react";
import { Input } from "@/common/components/ui/input";
import type { ApplicationFormApi } from "../application-edit.hooks";
import { controlProps, firstFieldError } from "./field-props";
import { FormField } from "./form-field";

interface Props {
  form: ApplicationFormApi;
}

export function JobSection({ form }: Props) {
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
          return (
            <FormField id="field-title" label="Puesto" required error={error}>
              <Input
                {...controlProps({ id: "field-title", error, required: true })}
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
          return (
            <FormField
              id="field-company"
              label="Empresa"
              required
              error={error}
            >
              <Input
                {...controlProps({
                  id: "field-company",
                  error,
                  required: true,
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
