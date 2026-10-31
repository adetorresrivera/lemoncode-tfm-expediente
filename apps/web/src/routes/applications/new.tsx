import { createFileRoute } from "@tanstack/react-router";
import { ApplicationEditScene } from "@/scenes/application-edit.scene";

export const Route = createFileRoute("/applications/new")({
  component: function ApplicationNewRoute() {
    return <ApplicationEditScene />;
  },
});
