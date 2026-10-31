import {
  applicationInputSchema,
  applicationQuerySchema,
  statusChangeSchema,
} from "@tfm/contracts";
import { Hono } from "hono";
import { parseObjectId } from "../http/object-id.js";
import { queryInput } from "../http/query-input.js";
import { requireJson } from "../http/require-json.js";
import type { ApplicationsService } from "./applications.service.js";

// No try/catch and no logging: ZodError, SyntaxError and ApiError reach the parent onError.
export function applicationsRoutes(service: ApplicationsService): Hono {
  const routes = new Hono();

  routes.use("*", requireJson);

  routes.get("/", async (c) =>
    c.json(
      await service.list(
        applicationQuerySchema.parse(queryInput(c.req.queries())),
      ),
    ),
  );

  routes.get("/:id", async (c) =>
    c.json(await service.get(parseObjectId(c.req.param("id")))),
  );

  routes.post("/", async (c) => {
    const input = applicationInputSchema.parse(await c.req.json());
    return c.json(await service.create(input), 201);
  });

  routes.patch("/:id/status", async (c) => {
    const id = parseObjectId(c.req.param("id"));
    const { status } = statusChangeSchema.parse(await c.req.json());
    return c.json(await service.changeStatus(id, status));
  });

  return routes;
}
