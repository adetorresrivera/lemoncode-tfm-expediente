import type { ApplicationStatus } from "@tfm/contracts";
import type { ReactElement, ReactNode } from "react";

export interface DetailTagVm {
  label: string;
  soft: boolean;
}

export interface DetailTagGroupVm {
  title: string;
  tags: DetailTagVm[];
}

export interface DetailHistoryEntryVm {
  status: ApplicationStatus;
  atLabel: string;
}

export interface ApplicationDetailVm {
  id: string;
  title: string;
  company: string;
  location: string | null;
  status: ApplicationStatus;
  salaryLine: string | null;
  appliedAtLabel: string | null;
  sourceUrl: string | null;
  createdAtLabel: string;
  updatedAtLabel: string;
  tagGroups: DetailTagGroupVm[];
  notes: string | null;
  offerText: string | null;
  // Newest first: the first entry is the current status.
  history: DetailHistoryEntryVm[];
}

// Feedback of a mutation shown in an always-mounted polite status slot.
export interface StatusFeedback {
  kind: "loading" | "success" | "error";
  message: string;
}

export type DeleteState = "idle" | "deleting" | "error";

// Navigation seam: the scene decides where a link points and returns the router link; the pod
// only supplies classes and content (React types only, no router import in a pod).
export type RenderListLink = (link: {
  className?: string;
  children: ReactNode;
}) => ReactElement;

// Same seam for the link to the edit form.
export type RenderEditLink = RenderListLink;
