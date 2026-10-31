import { RotateCcw } from "lucide-react";
import { Button } from "@/common/components/ui/button";

interface Props {
  onClear: () => void;
}

export function EmptyFilteredState({ onClear }: Props) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-md border border-border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-base font-semibold leading-[1.2] text-foreground">
          Ninguna candidatura coincide con los filtros
        </h2>
        <p className="text-sm text-foreground">
          Prueba con otros términos o quita algún filtro.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-11"
        onClick={onClear}
      >
        <RotateCcw aria-hidden="true" />
        Limpiar filtros
      </Button>
    </section>
  );
}
