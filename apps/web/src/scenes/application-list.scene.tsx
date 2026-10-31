import { useEffect } from "react";
import { ApplicationListContainer } from "@/pods/application-list";

export function ApplicationListScene() {
  useEffect(() => {
    document.title = "Mis candidaturas · Expediente";
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Expediente
        </p>
        <h1
          tabIndex={-1}
          className="font-serif text-[28px] font-semibold leading-[1.2]"
        >
          Mis candidaturas
        </h1>
      </header>
      <ApplicationListContainer />
    </div>
  );
}
