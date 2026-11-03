import { createFileRoute } from "@tanstack/react-router";
import { ApplicationListScene } from "@/scenes/application-list.scene";

export const Route = createFileRoute("/applications/")({
  component: ApplicationListScene,
});
