import type {
  ApplicationStatus,
  ContractType,
  Seniority,
  TagGroup,
  WorkMode,
} from "@tfm/contracts";
import type { ReactElement, ReactNode } from "react";

export interface ApplicationFormTag {
  label: string;
  group: TagGroup;
}

// What the form edits: every control holds a string (or the tag list), so nullable API fields are
// "" here and become null in the mapper. Written field by field on purpose: the form model is not
// derived from the API model (D-16).
export interface ApplicationFormValues {
  title: string;
  company: string;
  location: string;
  workMode: WorkMode | "";
  seniority: Seniority | "";
  contractType: ContractType | "";
  salaryMin: string;
  salaryMax: string;
  currency: string;
  tags: ApplicationFormTag[];
  status: ApplicationStatus;
  // yyyy-mm-dd in the local calendar, the value of an <input type="date">.
  appliedAt: string;
  sourceUrl: string;
  notes: string;
  // The analyzed offer, "" when there is none. Only a successful analysis sets it (D-10); the
  // textarea draft lives in the extraction hook and never reaches this value by typing.
  offerText: string;
}

export type FormFieldName = keyof ApplicationFormValues;

export const EMPTY_FORM_VALUES: ApplicationFormValues = {
  title: "",
  company: "",
  location: "",
  workMode: "",
  seniority: "",
  contractType: "",
  salaryMin: "",
  salaryMax: "",
  currency: "EUR",
  tags: [],
  status: "guardada",
  appliedAt: "",
  sourceUrl: "",
  notes: "",
  offerText: "",
};

// Form-level message shown in the always-mounted polite status slot above the actions.
export interface FormMessage {
  kind: "error";
  message: string;
}

// Navigation seam: the scene decides where «Descartar cambios» goes and returns the router link;
// the pod only supplies classes and content (React types only, no router import in a pod).
export type RenderCancelLink = (link: {
  className?: string;
  children: ReactNode;
}) => ReactElement;

// Same seam for the link to the list (the not-found state of the edit load).
export type RenderListLink = RenderCancelLink;

// What the edit mode shows about the loaded application besides the form values. `appliedAt` is
// the stored ISO instant: the save sends it back untouched when the date was not edited.
export interface ApplicationEditSummary {
  title: string;
  company: string;
  status: ApplicationStatus;
  appliedAt: string | null;
}

// Fields the AI analysis can fill. The merge lists the ones it wrote; the hook applies them
// without running the field listeners.
export type AiFillableField =
  | "title"
  | "company"
  | "location"
  | "workMode"
  | "seniority"
  | "contractType"
  | "salaryMin"
  | "salaryMax"
  | "currency";

// The four fields that matter to find and compare an application, in form order. The merge reports
// the ones that are still empty so the user knows what to complete (AI-08).
export type RelevantField = "title" | "company" | "workMode" | "seniority";

export const RELEVANT_FIELDS: readonly RelevantField[] = [
  "title",
  "company",
  "workMode",
  "seniority",
];

// Result of merging an extraction into the current form values: the new values, the fields the AI
// filled (in form order), the keys (tagKey) of the tags it added and the relevant fields still
// empty afterwards.
export interface ExtractionMerge {
  values: ApplicationFormValues;
  aiFields: AiFillableField[];
  aiTags: string[];
  missingFields: RelevantField[];
}

// The session view of a merge's lists, what the form marks: «IA» next to fields, «Complétalo tú»
// on relevant fields still empty and the AI mark on the tag chips (keys from tagKey).
export interface AiMarks {
  aiFields: ReadonlySet<AiFillableField>;
  aiTags: ReadonlySet<string>;
  missingFields: ReadonlySet<RelevantField>;
}

export type OfferErrorReason = "timeout" | "model" | "network" | "length";

export type OfferAnalysisStatus =
  | { kind: "idle" }
  | { kind: "analysing" }
  | {
      kind: "success";
      filled: number;
      tagsAdded: number;
      missing: RelevantField[];
    }
  | { kind: "error"; reason: OfferErrorReason };

// What the «Pegar oferta» panel needs: the container owns the draft and the analysis state.
export interface OfferPanelModel {
  defaultOpen: boolean;
  draft: string;
  status: OfferAnalysisStatus;
  onDraftChange: (draft: string) => void;
  onAnalyze: () => void;
}
