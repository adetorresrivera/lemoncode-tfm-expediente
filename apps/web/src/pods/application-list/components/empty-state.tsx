import type { ReactElement, ReactNode } from "react";
import { Button } from "@/common/components/ui/button";

// Navigation seam: the scene decides where the link points and returns the router link.
export type RenderCreateLink = (link: {
  className?: string;
  children: ReactNode;
}) => ReactElement;

interface Props {
  renderCreateLink: RenderCreateLink;
}

export function EmptyState({ renderCreateLink }: Props) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-md border border-border bg-card p-6 text-muted-foreground">
      <p>Aún no has guardado ninguna oferta. Empieza añadiendo la primera.</p>
      <Button
        asChild
        variant="outline"
        className="h-11 w-full text-foreground sm:w-auto"
      >
        {renderCreateLink({ children: "Añadir la primera candidatura" })}
      </Button>
    </section>
  );
}
