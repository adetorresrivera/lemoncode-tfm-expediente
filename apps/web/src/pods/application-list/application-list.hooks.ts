import type { Application } from "@tfm/contracts";
import { useState } from "react";
import { mapApplicationListFromApiToVm } from "./application-list.mapper";
import type { ApplicationListItem } from "./application-list.vm";

// Phase 1 issues no request: GET /api/applications is APP-04 (Phase 2), which
// adds the getApplications call (fetch + AbortController) inside this hook.
export const useApplicationList = (): {
  applications: ApplicationListItem[];
} => {
  const [applications] = useState<ApplicationListItem[]>(() => {
    const fromApi: Application[] = [];
    return mapApplicationListFromApiToVm(fromApi);
  });

  return { applications };
};
