import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ApplicationEditContainer } from "@/pods/application-edit";

interface Props {
  applicationId?: string;
}

// The scene decides where the pod's cancel link points and where to go after a save; the pod only
// receives a link render prop and an `onSaved` callback. Create mode: no application id.
export function ApplicationEditScene({ applicationId }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Añadir candidatura · Expediente";
  }, []);

  const handleSaved = (id: string) => {
    void navigate({
      to: "/applications/$applicationId",
      params: { applicationId: id },
      replace: true,
      state: { focusHeading: true, notice: "Candidatura creada." },
    });
  };

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
          Añadir candidatura
        </h1>
      </header>
      <ApplicationEditContainer
        applicationId={applicationId}
        onSaved={handleSaved}
        renderCancelLink={({ className, children }) => (
          <Link
            to="/applications"
            state={{ focusHeading: true }}
            className={className}
          >
            {children}
          </Link>
        )}
      />
    </div>
  );
}
