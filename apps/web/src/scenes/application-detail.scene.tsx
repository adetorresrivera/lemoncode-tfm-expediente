import { Link, useNavigate } from "@tanstack/react-router";
import { useArrivalNotice } from "@/core/router/use-arrival-notice";
import { ApplicationDetailContainer } from "@/pods/application-detail";

interface Props {
  applicationId: string;
}

// The scene decides where the pod's links point and where to go after a delete; the pod only
// receives link render props and an `onDeleted` callback. The arrival notice and the heading focus
// come from the one-shot history state of the navigation that brought the user here.
export function ApplicationDetailScene({ applicationId }: Props) {
  const navigate = useNavigate();
  const { notice, focusHeadingRef } = useArrivalNotice();

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
      notice={notice}
      focusHeadingRef={focusHeadingRef}
      renderListLink={({ className, children }) => (
        <Link to="/applications" className={className}>
          {children}
        </Link>
      )}
      renderEditLink={({ className, children }) => (
        <Link
          to="/applications/$applicationId/edit"
          params={{ applicationId }}
          className={className}
        >
          {children}
        </Link>
      )}
    />
  );
}
