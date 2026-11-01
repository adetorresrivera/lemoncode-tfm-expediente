import { offerExtractRequestSchema } from "@tfm/contracts";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { ApiError } from "../errors.js";
import { requireJson } from "../http/require-json.js";
import type { ExtractService } from "./extract.service.js";

// No try/catch and no logging: ZodError, SyntaxError and ApiError reach the parent onError.
// The endpoint has no database dependency and persists nothing (AI-06).
export function offersRoutes(service: ExtractService): Hono {
  const routes = new Hono();

  routes.use("*", requireJson);
  // 256 KiB covers 20,000 multi-byte characters plus JSON escaping; Hono's default 413 is bare text.
  routes.use(
    "*",
    bodyLimit({
      maxSize: 256 * 1024,
      onError: () => {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "La oferta es demasiado larga",
        );
      },
    }),
  );

  routes.post("/extract", async (c) => {
    const { text } = offerExtractRequestSchema.parse(await c.req.json());
    // The Node adapter aborts this signal when the browser cancels, which also stops the model call.
    return c.json(await service.extract(text, { signal: c.req.raw.signal }));
  });

  return routes;
}
