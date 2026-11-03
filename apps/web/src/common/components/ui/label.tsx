import * as React from "react";
import { cn } from "@/common/lib/utils";
import { Label as LabelPrimitive } from "radix-ui";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "text-sm font-semibold leading-normal text-foreground select-none",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
