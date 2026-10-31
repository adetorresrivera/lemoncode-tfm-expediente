import { Link, useNavigate } from "@tanstack/react-router";
import { ApplicationDetailContainer } from "@/pods/application-detail";

interface Props {
  applicationId: string;
}

// The scene decides where the pod's links point and where to go after a delete; the pod only
// receives link render props and an `onDeleted` callback.
export function ApplicationDetailScene({ applicationId }: Props) {
  const navigate = useNavigate();

  const handleDeleted = () => {
    void navigate({
      to: "/applications",
      replace: true,
      state: { focusHeading: true, notice: "Candidatura eliminada." },
    });
  };

  return (
    <ApplicationDetailContainer
      applicationId={applicationId}
      onDeleted={handleDeleted}
      renderListLink={({ className, children }) => (
        <Link to="/applications" className={className}>
          {children}
        </Link>
      )}
    />
  );
}
