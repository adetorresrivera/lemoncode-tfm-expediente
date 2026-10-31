import { applicationSchema, type Application } from "@tfm/contracts";
import { request } from "@/core/http/http-client";
import type { ListSearch } from "@/core/router/application-search";

// The query string is built from the known keys only; the search object is never spread, so a
// crafted URL cannot add parameters to the API call.
export const buildApplicationsQuery = (query: ListSearch): string => {
  const params = new URLSearchParams();
  for (const status of query.status ?? []) params.append("status", status);
  for (const tag of query.tags ?? []) params.append("tags", tag);
  if (query.workMode) params.set("workMode", query.workMode);
  if (query.seniority) params.set("seniority", query.seniority);
  if (query.q) params.set("q", query.q);
  params.set("sort", query.sort);
  return params.toString();
};

export const getApplications = (
  query: ListSearch,
  signal?: AbortSignal,
): Promise<Application[]> =>
  request(
    `/api/applications?${buildApplicationsQuery(query)}`,
    applicationSchema.array(),
    { signal },
  );
