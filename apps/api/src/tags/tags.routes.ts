import { Hono } from "hono";
import type { ApplicationsService } from "../applications/applications.service.js";

export function tagsRoutes(service: ApplicationsService): Hono {
  const routes = new Hono();

  routes.get("/", async (c) => c.json(await service.listTags()));

  return routes;
}
