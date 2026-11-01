import { offerExtractRequestSchema } from "@tfm/contracts";
import { Hono } from "hono";
import { requireJson } from "../http/require-json.js";
import type { ExtractService } from "./extract.service.js";

// No try/catch and no logging: ZodError, SyntaxError and ApiError reach the parent onError.
// The endpoint has no database dependency and persists nothing (AI-06).
export function offersRoutes(service: ExtractService): Hono {
  const routes = new Hono();

  routes.use("*", requireJson);

  routes.post("/extract", async (c) => {
    const { text } = offerExtractRequestSchema.parse(await c.req.json());
    return c.json(await service.extract(text));
  });

  return routes;
}
