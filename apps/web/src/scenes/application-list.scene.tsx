import { ApplicationListContainer } from "@/pods/application-list";

export function ApplicationListScene() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Expediente
        </p>
        <h1 className="font-serif text-3xl">Mis candidaturas</h1>
      </header>
      <ApplicationListContainer />
    </div>
  );
}
