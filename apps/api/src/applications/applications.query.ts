import { tagKey, type ApplicationQuery } from "@tfm/contracts";
import type { Filter, Sort } from "mongodb";
import type { ApplicationDoc } from "./applications.repository.js";

// Every regex metacharacter, so the user's text is always matched literally (D-03).
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Built field by field from the parsed query: nothing from the request is spread into the filter.
// An empty $in or $all matches nothing in Mongo, so those conditions are added only when non-empty.
export function buildApplicationsFilter(
  query: ApplicationQuery,
): Filter<ApplicationDoc> {
  const filter: Filter<ApplicationDoc> = {};

  if (query.status && query.status.length > 0) {
    filter.status = { $in: query.status };
  }
  // D-04: AND over the stored key, the same function that deduplicates tags on write.
  if (query.tags && query.tags.length > 0) {
    filter.tags = {
      $all: query.tags.map((label) => ({
        $elemMatch: { key: tagKey(label), group: "stack" as const },
      })),
    };
  }
  if (query.workMode) filter.workMode = query.workMode;
  if (query.seniority) filter.seniority = query.seniority;
  if (query.q) {
    const pattern = { $regex: escapeRegex(query.q), $options: "i" };
    filter.$or = [{ title: pattern }, { company: pattern }];
  }

  return filter;
}

// Descending puts null and missing appliedAt last. _id closes every tie so the order is stable.
export function buildApplicationsSort(sort: ApplicationQuery["sort"]): Sort {
  return sort === "appliedAt"
    ? { appliedAt: -1, updatedAt: -1, _id: -1 }
    : { updatedAt: -1, _id: -1 };
}
