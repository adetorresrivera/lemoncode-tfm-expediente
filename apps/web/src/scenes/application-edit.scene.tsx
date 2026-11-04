import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ApplicationEditContainer } from "@/pods/application-edit";
import { DocumentUploadContainer } from "@/pods/document-upload";

interface Props {
  applicationId?: string;
}

// The scene decides where the pod's links point and where to go after a save; the pod only
// receives link render props and an `onSaved` callback. Create mode: no application id.
export function ApplicationEditScene({ applicationId }: Props) {
  const navigate = useNavigate();
  const isEdit = applicationId !== undefined;
  const heading = isEdit ? "Editar candidatura" : "Añadir candidatura";

  useEffect(() => {
    document.title = `${heading} · Expediente`;
  }, [heading]);

  const handleSaved = (id: string) => {
    void navigate({
      to: "/applications/$applicationId",
      params: { applicationId: id },
      replace: true,
      state: {
        focusHeading: true,
        notice: isEdit ? "Cambios guardados." : "Candidatura creada.",
      },
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
          {heading}
        </h1>
      </header>
      <ApplicationEditContainer
        applicationId={applicationId}
        onSaved={handleSaved}
        renderCancelLink={({ className, children }) =>
          applicationId !== undefined ? (
            <Link
              to="/applications/$applicationId"
              params={{ applicationId }}
              state={{ focusHeading: true }}
              className={className}
            >
              {children}
            </Link>
          ) : (
            <Link
              to="/applications"
              state={{ focusHeading: true }}
              className={className}
            >
              {children}
            </Link>
          )
        }
        renderListLink={({ className, children }) => (
          <Link to="/applications" className={className}>
            {children}
          </Link>
        )}
        renderDocumentPicker={({ type, selectedId, onSelected, error }) => (
          <DocumentUploadContainer
            type={type}
            selectedId={selectedId}
            onSelected={onSelected}
            error={error}
          />
        )}
      />
    </div>
  );
}
