import { applicationSchema, type Application } from "@tfm/contracts";
import { request } from "@/core/http/http-client";

// The id comes from the URL, so it is encoded before it reaches the API path.
export const getApplication = (
  id: string,
  signal?: AbortSignal,
): Promise<Application> =>
  request(`/api/applications/${encodeURIComponent(id)}`, applicationSchema, {
    signal,
  });
