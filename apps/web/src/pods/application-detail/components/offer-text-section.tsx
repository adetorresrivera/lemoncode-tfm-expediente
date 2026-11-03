import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/common/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/common/components/ui/collapsible";

interface Props {
  offerText: string;
}

// Up to 20,000 characters: the text stays unmounted until the user opens it and is rendered as a
// text node that wraps with the page (no inner scroll box).
export function OfferTextSection({ offerText }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-labelledby="offer-text-heading"
      className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6"
    >
      <h2
        id="offer-text-heading"
        className="font-serif text-base font-semibold leading-[1.2]"
      >
        Texto original de la oferta
      </h2>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full justify-between px-4"
          >
            {open ? "Ocultar texto original" : "Mostrar texto original"}
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform data-[state=open]:rotate-180 motion-reduce:transition-none"
              data-state={open ? "open" : "closed"}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <p className="whitespace-pre-wrap break-words text-base">
            {offerText}
          </p>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
