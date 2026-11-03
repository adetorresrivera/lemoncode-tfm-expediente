import { createFileRoute } from "@tanstack/react-router";
import { ApplicationDetailScene } from "@/scenes/application-detail.scene";

export const Route = createFileRoute("/applications/$applicationId/")({
  component: function ApplicationDetailRoute() {
    const { applicationId } = Route.useParams();
    return <ApplicationDetailScene applicationId={applicationId} />;
  },
});
