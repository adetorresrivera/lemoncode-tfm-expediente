import { applicationSchema, type Application } from "@tfm/contracts";
import { request } from "@/core/http/http-client";

export const getApplications = (signal?: AbortSignal): Promise<Application[]> =>
  request("/api/applications", applicationSchema.array(), { signal });
