import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { CircleAlert, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/common/components/ui/button";

// Spanish route-error screen. The thrown error goes to the console only: its message is never
// rendered (the copy is fixed, same rule as `ListError`).
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    document.title = "Algo ha fallado · Expediente";
    headingRef.current?.focus();
  }, []);

  const handleReload = () => {
    reset();
    void router.invalidate();
  };

  return (
    <section
      role="alert"
      className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 rounded-md border border-border bg-card p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Expediente
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-serif text-[28px] leading-[1.2] font-semibold outline-none"
      >
        Algo ha fallado
      </h1>
      <div className="flex items-start gap-2 text-base">
        <CircleAlert
          strokeWidth={1.5}
          className="mt-1 size-4 shrink-0 text-foreground"
          aria-hidden="true"
        />
        <p>
          No se pudo mostrar esta pantalla. Inténtalo de nuevo o vuelve a Mis
          candidaturas.
        </p>
      </div>
      <div className="flex w-full flex-wrap gap-2">
        <Button
          type="button"
          className="h-11 w-full sm:w-auto"
          onClick={handleReload}
        >
          <RotateCcw strokeWidth={1.5} className="size-4" aria-hidden="true" />
          Volver a cargar la pantalla
        </Button>
        <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
          <a href="/applications">Volver a Mis candidaturas</a>
        </Button>
      </div>
    </section>
  );
}

// Root-route failure: the shell is gone, so the same card renders standalone.
export function RootError(props: ErrorComponentProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <RouteError {...props} />
    </div>
  );
}
