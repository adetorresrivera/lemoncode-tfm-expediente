import { applicationQuerySchema } from "@tfm/contracts";
import { z } from "zod";

const { status, tags, workMode, seniority, q, sort } =
  applicationQuerySchema.shape;

// Derived field by field from the contract so the web never redefines the query model, but
// lenient: an invalid value degrades to "filter not applied" (or the default sort) instead of
// rejecting the whole URL. An explicit `undefined` also overrides the raw key that the router
// merges back into the search object.
export const listSearchSchema = z.object({
  status: status.catch(undefined),
  tags: tags.catch(undefined),
  workMode: workMode.catch(undefined),
  seniority: seniority.catch(undefined),
  q: q.catch(undefined),
  sort: sort.catch("updatedAt"),
});

export type ListSearch = z.output<typeof listSearchSchema>;

const DEFAULT_SORT: ListSearch["sort"] = "updatedAt";

export const hasActiveFilters = (search: ListSearch): boolean =>
  search.q !== undefined ||
  (search.status?.length ?? 0) > 0 ||
  (search.tags?.length ?? 0) > 0 ||
  search.workMode !== undefined ||
  search.seniority !== undefined;

export const isDefaultSort = (search: ListSearch): boolean =>
  search.sort === DEFAULT_SORT;

// The router merges raw URL keys into the search object, so junk such as `status[$ne]` reaches
// `useSearch()`. Everything that leaves the router goes through this projection first.
export const pickListSearch = (search: ListSearch): ListSearch => ({
  status: search.status,
  tags: search.tags,
  workMode: search.workMode,
  seniority: search.seniority,
  q: search.q,
  sort: search.sort,
});
