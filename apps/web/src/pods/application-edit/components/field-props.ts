interface FieldPropsInput {
  id: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

// Reads the first message out of TanStack Form's error list (strings from our validators).
export const firstFieldError = (
  errors: readonly unknown[],
): string | undefined =>
  errors.find((error): error is string => typeof error === "string");

// The accessibility wiring every control shares: the id of its label, the ids of the hint and
// error lines that exist, invalid and required state. `FormField` renders the matching lines.
export const controlProps = ({
  id,
  hint,
  error,
  required,
}: FieldPropsInput) => {
  const describedBy = [
    hint !== undefined ? `${id}-hint` : null,
    error !== undefined ? `${id}-error` : null,
  ]
    .filter((value) => value !== null)
    .join(" ");
  return {
    id,
    "aria-describedby": describedBy === "" ? undefined : describedBy,
    "aria-invalid": error !== undefined ? (true as const) : undefined,
    "aria-required": required === true ? (true as const) : undefined,
  };
};
