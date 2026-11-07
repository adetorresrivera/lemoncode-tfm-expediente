import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/common/components/ui/button";

// Spanish 404 screen; the router renders it inside the shell's `<main>` for an unknown URL.
export function RouteNotFound() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = "Página no encontrada · Expediente";
    headingRef.current?.focus();
  }, []);

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 rounded-md border border-border bg-card p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Expediente
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-serif text-[28px] leading-[1.2] font-semibold outline-none"
      >
        No encontramos esta página
      </h1>
      <p className="text-base">
        La dirección no existe o ya no está disponible.
      </p>
      <Button asChild className="h-11 w-full sm:w-auto">
        <Link to="/applications">
          <ArrowLeft strokeWidth={1.5} className="size-4" aria-hidden="true" />
          Volver a Mis candidaturas
        </Link>
      </Button>
    </section>
  );
}
