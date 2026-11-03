import { createFileRoute } from "@tanstack/react-router";
import { ApplicationEditScene } from "@/scenes/application-edit.scene";

export const Route = createFileRoute("/applications/$applicationId/edit")({
  component: function ApplicationEditRoute() {
    const { applicationId } = Route.useParams();
    return <ApplicationEditScene applicationId={applicationId} />;
  },
});
