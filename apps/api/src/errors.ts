import type { ErrorCode } from "@tfm/contracts";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class ApiError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(status: ContentfulStatusCode, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
