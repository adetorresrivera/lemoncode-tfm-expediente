import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Label } from "@/common/components/ui/label";

interface Props {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}

// Label, control, hint and error of one field. The control gets its aria props from
// `controlProps` so `aria-describedby` points at the lines rendered here.
export function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  children,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children}
      {hint !== undefined ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
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
