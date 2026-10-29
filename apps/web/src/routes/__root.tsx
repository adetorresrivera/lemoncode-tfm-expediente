import { createRootRoute } from "@tanstack/react-router";
import { AppLayout } from "@/layouts/app-layout";

export const Route = createRootRoute({
  component: AppLayout,
});
