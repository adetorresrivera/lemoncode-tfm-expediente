import { useId } from "react";
import {
  contractTypeSchema,
  senioritySchema,
  workModeSchema,
} from "@tfm/contracts";
import { Input } from "@/common/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/common/components/ui/native-select";
import {
  CONTRACT_TYPE_LABELS,
  SENIORITY_LABELS,
  WORK_MODE_LABELS,
} from "@/common/lib/enum-labels";
import type { ApplicationFormApi } from "../application-edit.hooks";
import { controlProps, firstFieldError } from "./field-props";
import { FormField } from "./form-field";

interface Props {
  form: ApplicationFormApi;
}

const DEFAULT_CURRENCIES = ["EUR", "USD", "GBP"];

// A stored code outside the list stays selectable instead of silently turning into EUR.
const currencyOptions = (current: string): string[] =>
  current === "" || DEFAULT_CURRENCIES.includes(current)
    ? DEFAULT_CURRENCIES
    : [...DEFAULT_CURRENCIES, current];

export function ConditionsSection({ form }: Props) {
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
        Condiciones
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <form.Field name="workMode">
          {(field) => {
            const error = firstFieldError(field.state.meta.errors);
            return (
              <FormField id="field-workMode" label="Modalidad" error={error}>
                <NativeSelect
                  {...controlProps({ id: "field-workMode", error })}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    field.handleChange(
                      workModeSchema.safeParse(event.target.value).data ?? "",
                    )
                  }
                >
                  <NativeSelectOption value="">Sin indicar</NativeSelectOption>
                  {workModeSchema.options.map((option) => (
                    <NativeSelectOption key={option} value={option}>
                      {WORK_MODE_LABELS[option]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
            );
          }}
        </form.Field>
        <form.Field name="seniority">
          {(field) => {
            const error = firstFieldError(field.state.meta.errors);
            return (
              <FormField id="field-seniority" label="Seniority" error={error}>
                <NativeSelect
                  {...controlProps({ id: "field-seniority", error })}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    field.handleChange(
                      senioritySchema.safeParse(event.target.value).data ?? "",
                    )
                  }
                >
                  <NativeSelectOption value="">Sin indicar</NativeSelectOption>
                  {senioritySchema.options.map((option) => (
                    <NativeSelectOption key={option} value={option}>
                      {SENIORITY_LABELS[option]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
            );
          }}
        </form.Field>
        <form.Field name="contractType">
          {(field) => {
            const error = firstFieldError(field.state.meta.errors);
            return (
              <FormField
                id="field-contractType"
                label="Tipo de contrato"
                error={error}
              >
                <NativeSelect
                  {...controlProps({ id: "field-contractType", error })}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    field.handleChange(
                      contractTypeSchema.safeParse(event.target.value).data ??
                        "",
                    )
                  }
                >
                  <NativeSelectOption value="">Sin indicar</NativeSelectOption>
                  {contractTypeSchema.options.map((option) => (
                    <NativeSelectOption key={option} value={option}>
                      {CONTRACT_TYPE_LABELS[option]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
            );
          }}
        </form.Field>
        <form.Field name="location">
          {(field) => {
            const error = firstFieldError(field.state.meta.errors);
            return (
              <FormField id="field-location" label="Ubicación" error={error}>
                <Input
                  {...controlProps({ id: "field-location", error })}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </FormField>
            );
          }}
        </form.Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <form.Field name="salaryMin">
          {(field) => {
            const error = firstFieldError(field.state.meta.errors);
            const hint = "Importe anual bruto.";
            return (
              <FormField
                id="field-salaryMin"
                label="Salario mínimo"
                hint={hint}
                error={error}
              >
                <Input
                  {...controlProps({ id: "field-salaryMin", hint, error })}
                  name={field.name}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </FormField>
            );
          }}
        </form.Field>
        <form.Field name="salaryMax">
          {(field) => {
            const error = firstFieldError(field.state.meta.errors);
            return (
              <FormField
                id="field-salaryMax"
                label="Salario máximo"
                error={error}
              >
                <Input
                  {...controlProps({ id: "field-salaryMax", error })}
                  name={field.name}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </FormField>
            );
          }}
        </form.Field>
        <form.Field name="currency">
          {(field) => {
            const error = firstFieldError(field.state.meta.errors);
            return (
              <FormField id="field-currency" label="Moneda" error={error}>
                <NativeSelect
                  {...controlProps({ id: "field-currency", error })}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                >
                  {currencyOptions(field.state.value).map((code) => (
                    <NativeSelectOption key={code} value={code}>
                      {code}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
            );
          }}
        </form.Field>
      </div>
    </section>
  );
}
