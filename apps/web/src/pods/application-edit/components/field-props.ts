interface FieldPropsInput {
  id: string;
  hint?: string;
  error?: string;
  required?: boolean;
  // The AI filled this field and the user has not touched it since («IA» badge shown).
  aiFilled?: boolean;
  // A relevant field the analysis left empty («Complétalo tú»). A validation error wins over it.
  missing?: boolean;
}

// Reads the first message out of TanStack Form's error list (strings from our validators).
export const firstFieldError = (
  errors: readonly unknown[],
): string | undefined =>
  errors.find((error): error is string => typeof error === "string");

// The accessibility wiring every control shares: the id of its label, the ids of the hint, badge,
// missing and error lines that exist, invalid and required state. `FormField` renders the matching
// lines. The gold classes are merged onto the control by its `className` (tailwind-merge resolves
// them against the base border and background).
export const controlProps = ({
  id,
  hint,
  error,
  required,
  aiFilled,
  missing,
}: FieldPropsInput) => {
  const showMissing = missing === true && error === undefined;
  const describedBy = [
    hint !== undefined ? `${id}-hint` : null,
    aiFilled === true ? `${id}-ai` : null,
    showMissing ? `${id}-missing` : null,
    error !== undefined ? `${id}-error` : null,
  ]
    .filter((value) => value !== null)
    .join(" ");
  return {
    id,
    "aria-describedby": describedBy === "" ? undefined : describedBy,
    "aria-invalid": error !== undefined ? (true as const) : undefined,
    "aria-required": required === true ? (true as const) : undefined,
    className: showMissing ? "border-brand-gold bg-ai-missing-bg" : undefined,
  };
};
