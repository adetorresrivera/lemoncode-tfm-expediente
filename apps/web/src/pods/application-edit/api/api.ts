import {
  applicationSchema,
  type Application,
  type ApplicationInput,
} from "@tfm/contracts";
import { request } from "@/core/http/http-client";

// The input is the schema-validated draft (trimmed, defaults applied); the server validates it
// again with the same schema.
export const createApplication = (
  input: ApplicationInput,
): Promise<Application> =>
  request("/api/applications", applicationSchema, {
    method: "POST",
    body: input,
  });
