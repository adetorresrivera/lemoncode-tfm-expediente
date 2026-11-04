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
  // The values the edit dialog opens with (date in the browser zone, notes empty when null).
  editValues: InterviewFormValues;
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

// «Ronda» is optional when adding (the API numbers it) and required when editing (D-28).
export type InterviewFormMode = "add" | "edit";

// What the section can do with the rounds. `busy` is true while any mutation of the detail is in
// flight (status or round); `add` and `update` resolve on success and reject on failure so the
// dialog can stay open with its own error.
export interface InterviewActions {
  busy: boolean;
  feedback: string | null;
  add: (values: InterviewFormValues) => Promise<void>;
  update: (interviewId: string, values: InterviewFormValues) => Promise<void>;
  // Resolves on success and rejects on failure so the confirmation can stay open with its error.
  remove: (interviewId: string) => Promise<void>;
}

// One linked document as the aside shows it. Declared field by field, like every view model.
export interface DetailDocumentVm {
  id: string;
  // «CV Frontend · v3 · 12 oct. 2026»
  label: string;
  // «230 KB»
  sizeLabel: string;
  downloadHref: string;
  // «Descargar CV Frontend»
  downloadLabel: string;
}

// What one of the two fixed rows shows: no link, the request in flight, its answer or its failure.
export type DetailDocumentSlotVm =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "ok"; document: DetailDocumentVm }
  | { kind: "error" };

export interface DetailDocumentsVm {
  cv: DetailDocumentSlotVm;
  coverLetter: DetailDocumentSlotVm;
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
  // Ids of the linked CV and cover letter; the hook requests each one.
  documentLinks: { cv: string | null; coverLetter: string | null };
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
