import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { AiMark } from "@/common/components/ai-mark";
import { Label } from "@/common/components/ui/label";

interface Props {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  // The AI filled the field and the user has not edited it yet.
  aiFilled?: boolean;
  // A relevant field still empty after an analysis; hidden while there is an error.
  missing?: boolean;
  children: ReactNode;
}

// Label, control, hint and error of one field. The control gets its aria props from
// `controlProps` so `aria-describedby` points at the lines rendered here. The «IA» badge sits next
// to the label, outside the `label` element, so the control's accessible name stays the label.
export function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  aiFilled = false,
  missing = false,
  children,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Label htmlFor={id}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </Label>
        {aiFilled ? <AiMark id={`${id}-ai`} /> : null}
      </div>
      {children}
      {hint !== undefined ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {missing && error === undefined ? (
        <p
          id={`${id}-missing`}
          className="text-sm font-semibold text-brand-gold-ink"
        >
          Complétalo tú
        </p>
      ) : null}
      {error !== undefined ? (
        <p
          id={`${id}-error`}
          className="flex items-start gap-2 text-sm text-foreground"
        >
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-destructive"
          />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
