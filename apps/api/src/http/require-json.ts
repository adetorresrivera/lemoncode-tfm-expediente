import type { MiddlewareHandler } from "hono";
import { ApiError } from "../errors.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH"]);

// A cross-site "simple" request can carry a text/plain body without a CORS preflight.
// Rejecting anything that is not application/json before parsing closes that door.
export const requireJson: MiddlewareHandler = async (c, next) => {
  if (WRITE_METHODS.has(c.req.method)) {
    const contentType = c.req.header("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("application/json")) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Se esperaba application/json",
      );
    }
  }
  await next();
};
