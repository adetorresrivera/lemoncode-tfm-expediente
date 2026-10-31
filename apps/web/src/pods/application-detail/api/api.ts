import {
  applicationSchema,
  type Application,
  type ApplicationStatus,
} from "@tfm/contracts";
import { request } from "@/core/http/http-client";

// The id comes from the URL, so it is encoded before it reaches the API path.
export const getApplication = (
  id: string,
  signal?: AbortSignal,
): Promise<Application> =>
  request(`/api/applications/${encodeURIComponent(id)}`, applicationSchema, {
    signal,
  });

// The server answers with the whole updated application (history included).
export const patchApplicationStatus = (
  id: string,
  status: ApplicationStatus,
): Promise<Application> =>
  request(
    `/api/applications/${encodeURIComponent(id)}/status`,
    applicationSchema,
    { method: "PATCH", body: { status } },
  );
