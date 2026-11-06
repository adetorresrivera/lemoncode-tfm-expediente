import {
  applicationInputSchema,
  applicationQuerySchema,
  interviewInputSchema,
  statusChangeSchema,
} from "@tfm/contracts";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { ApiError } from "../errors.js";
import { parseObjectId } from "../http/object-id.js";
import { queryInput } from "../http/query-input.js";
import { requireJson } from "../http/require-json.js";
import type { ApplicationsService } from "./applications.service.js";

// No try/catch and no logging: ZodError, SyntaxError and ApiError reach the parent onError.
export function applicationsRoutes(service: ApplicationsService): Hono {
  const routes = new Hono();

  routes.use("*", requireJson);
  // Capped per router, so the upload route keeps its own 5 MB limit.
  routes.use(
    "*",
    bodyLimit({
      maxSize: 256 * 1024,
      onError: () => {
        throw new ApiError(
          413,
          "VALIDATION_ERROR",
          "Solicitud demasiado grande",
        );
      },
    }),
  );

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

  routes.put("/:id", async (c) => {
    const id = parseObjectId(c.req.param("id"));
    const input = applicationInputSchema.parse(await c.req.json());
    return c.json(await service.update(id, input));
  });

  routes.patch("/:id/status", async (c) => {
    const id = parseObjectId(c.req.param("id"));
    const { status } = statusChangeSchema.parse(await c.req.json());
    return c.json(await service.changeStatus(id, status));
  });

  routes.post("/:id/interviews", async (c) => {
    const id = parseObjectId(c.req.param("id"));
    const input = interviewInputSchema.parse(await c.req.json());
    return c.json(await service.addInterview(id, input), 201);
  });

  // The round id is a plain string compared by equality, never parsed as an ObjectId: an unknown or
  // malformed one answers «Ronda no encontrada».
  routes.put("/:id/interviews/:interviewId", async (c) => {
    const id = parseObjectId(c.req.param("id"));
    const input = interviewInputSchema.parse(await c.req.json());
    return c.json(
      await service.updateInterview(id, c.req.param("interviewId"), input),
    );
  });

  routes.delete("/:id/interviews/:interviewId", async (c) =>
    c.json(
      await service.removeInterview(
        parseObjectId(c.req.param("id")),
        c.req.param("interviewId"),
      ),
    ),
  );

  routes.delete("/:id", async (c) => {
    await service.remove(parseObjectId(c.req.param("id")));
    return c.body(null, 204);
  });

  return routes;
}
