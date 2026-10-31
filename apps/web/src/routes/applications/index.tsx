import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { listSearchSchema } from "@/core/router/application-search";
import { ApplicationListScene } from "@/scenes/application-list.scene";

export const Route = createFileRoute("/applications/")({
  validateSearch: listSearchSchema,
  search: { middlewares: [stripSearchParams({ sort: "updatedAt" })] },
  component: ApplicationListScene,
});
