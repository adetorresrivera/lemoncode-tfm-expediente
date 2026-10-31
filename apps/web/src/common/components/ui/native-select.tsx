import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/common/lib/utils";

// Native select in the field family of `Input` (same height, border and focus ring). The chevron
// is decoration: the control stays a real `select`, so the platform picker and the keyboard
// behaviour come for free.
function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          "h-11 w-full min-w-0 appearance-none rounded-md border border-input bg-card px-4 pr-10 text-base font-normal text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option data-slot="native-select-option" className={className} {...props} />
  );
}

export { NativeSelect, NativeSelectOption };
