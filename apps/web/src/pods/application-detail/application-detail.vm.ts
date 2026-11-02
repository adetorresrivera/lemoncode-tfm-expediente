import type {
  ApplicationStatus,
  InterviewMode,
  InterviewOutcome,
  InterviewType,
} from "@tfm/contracts";
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

// One interview round as the section shows it. Declared field by field: the view model never
// derives from the API model.
export interface InterviewVm {
  id: string;
  round: number;
  title: string;
  type: InterviewType;
  typeLabel: string;
  scheduledAt: string | null;
  // «5 nov. 2026, 10:30» in the browser zone, or null without a date.
  dateLabel: string | null;
  mode: InterviewMode;
  modeLabel: string;
  outcome: InterviewOutcome;
  outcomeLabel: string;
  notes: string | null;
}

// Every control of the round dialog holds a string (or a closed enum value), as the form does.
export interface InterviewFormValues {
  type: InterviewType | "";
  round: string;
  scheduledAt: string;
  mode: InterviewMode;
  outcome: InterviewOutcome;
  notes: string;
}

export type InterviewFormField = keyof InterviewFormValues;

// What the section can do with the rounds. `busy` is true while any mutation of the detail is in
// flight (status or round); `add` resolves on success and rejects on failure so the dialog can
// stay open with its own error.
export interface InterviewActions {
  busy: boolean;
  feedback: string | null;
  add: (values: InterviewFormValues) => Promise<void>;
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
  interviews: InterviewVm[];
  // Defaults of the add dialog (next round number computed from the stored rounds).
  newInterviewValues: InterviewFormValues;
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
