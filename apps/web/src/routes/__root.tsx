import { createRootRoute } from "@tanstack/react-router";
import { RootError } from "@/common/components/route-error";
import { AppLayout } from "@/layouts/app-layout";

export const Route = createRootRoute({
  component: AppLayout,
  errorComponent: RootError,
});
