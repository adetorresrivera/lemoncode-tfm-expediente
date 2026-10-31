import { Link } from "@tanstack/react-router";
import { ApplicationDetailContainer } from "@/pods/application-detail";

interface Props {
  applicationId: string;
}

// The scene decides where the pod's links point; the pod only receives link render props.
export function ApplicationDetailScene({ applicationId }: Props) {
  return (
    <ApplicationDetailContainer
      applicationId={applicationId}
      renderListLink={({ className, children }) => (
        <Link to="/applications" className={className}>
          {children}
        </Link>
      )}
    />
  );
}
