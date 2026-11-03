import {
  interviewInputSchema,
  type Application,
  type ApplicationStatus,
  type Interview,
} from "@tfm/contracts";
import {
  CONTRACT_TYPE_LABELS,
  INTERVIEW_MODE_LABELS,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_TYPE_LABELS,
  SENIORITY_LABELS,
  WORK_MODE_LABELS,
} from "@/common/lib/enum-labels";
import {
  formatDate,
  formatDateTime,
  formatSalaryRange,
  isoToLocalInput,
  localInputToIso,
} from "@/common/lib/format";
import type {
  ApplicationDetailVm,
  DetailTagGroupVm,
  InterviewFormField,
  InterviewFormMode,
  InterviewFormValues,
  InterviewVm,
} from "./application-detail.vm";

// Only http and https become links. The contract already restricts new data; this also covers
// legacy rows, and a value that does not parse is dropped instead of rendered.
export const toSafeHttpUrl = (url: string | null): string | null => {
  if (url === null) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? url
      : null;
  } catch {
    return null;
  }
};

const tagsOfGroup = (
  application: Application,
  group: "stack" | "nice_to_have" | "language",
) =>
  application.tags
    .filter((tag) => tag.group === group)
    .map((tag) => ({ label: tag.label, soft: group === "nice_to_have" }));

const single = (label: string | null) =>
  label === null ? [] : [{ label, soft: false }];

const buildTagGroups = (application: Application): DetailTagGroupVm[] => {
  const { workMode, seniority, contractType } = application;
  const groups: DetailTagGroupVm[] = [
    { title: "Stack tecnológico", tags: tagsOfGroup(application, "stack") },
    { title: "Se valora", tags: tagsOfGroup(application, "nice_to_have") },
    {
      title: "Modelo de trabajo",
      tags: single(workMode ? WORK_MODE_LABELS[workMode] : null),
    },
    {
      title: "Seniority",
      tags: single(seniority ? SENIORITY_LABELS[seniority] : null),
    },
    {
      title: "Contrato",
      tags: single(contractType ? CONTRACT_TYPE_LABELS[contractType] : null),
    },
    { title: "Idiomas", tags: tagsOfGroup(application, "language") },
  ];
  return groups.filter((group) => group.tags.length > 0);
};

export const mapInterviewFromApiToVm = (interview: Interview): InterviewVm => {
  const typeLabel = INTERVIEW_TYPE_LABELS[interview.type];
  return {
    id: interview.id,
    round: interview.round,
    title: `Ronda ${interview.round} · ${typeLabel}`,
    type: interview.type,
    typeLabel,
    scheduledAt: interview.scheduledAt,
    dateLabel:
      interview.scheduledAt === null
        ? null
        : formatDateTime(interview.scheduledAt),
    mode: interview.mode,
    modeLabel: INTERVIEW_MODE_LABELS[interview.mode],
    outcome: interview.outcome,
    outcomeLabel: INTERVIEW_OUTCOME_LABELS[interview.outcome],
    notes: interview.notes,
    editValues: {
      type: interview.type,
      round: String(interview.round),
      scheduledAt:
        interview.scheduledAt === null
          ? ""
          : isoToLocalInput(interview.scheduledAt),
      mode: interview.mode,
      outcome: interview.outcome,
      notes: interview.notes ?? "",
    },
  };
};

// Milliseconds of a stored date; no date, or one that does not parse, counts as «no date».
const instantOf = (scheduledAt: string | null): number | null => {
  if (scheduledAt === null) return null;
  const time = Date.parse(scheduledAt);
  return Number.isNaN(time) ? null : time;
};

// Round ascending, then date ascending with no date last (compared as instants: the stored string
// may carry any sub-second precision), then id so the order is stable. Works on a copy (D-07).
const compareInterviews = (a: Interview, b: Interview): number => {
  if (a.round !== b.round) return a.round - b.round;
  const aTime = instantOf(a.scheduledAt);
  const bTime = instantOf(b.scheduledAt);
  if (aTime !== bTime) {
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return aTime - bTime;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

// Highest stored round + 1 (1 without rounds), capped so the number stays a valid contract value.
export const nextInterviewRound = (
  interviews: readonly { round: number }[],
): number =>
  Math.min(
    interviews.reduce((highest, { round }) => Math.max(highest, round), 0) + 1,
    Number.MAX_SAFE_INTEGER,
  );

// Defaults of the add dialog (D-19): no type chosen, the next round, online and pending.
export const newInterviewFormValues = (
  nextRound: number,
): InterviewFormValues => ({
  type: "",
  round: String(nextRound),
  scheduledAt: "",
  mode: "online",
  outcome: "pendiente",
  notes: "",
});

// The API draft of the round form: loose values that the contracts schema then validates.
export interface InterviewInputDraft {
  type: string;
  round?: number;
  scheduledAt: string | null;
  mode: string;
  outcome: string;
  notes: string | null;
}

// The stored date of a round next to the control value it was shown as. The control keeps only
// minutes in the browser zone, so a stored instant it cannot represent (seconds, the second pass
// of the autumn DST overlap) would move on save. While the control still holds the loaded value,
// the stored instant goes back untouched.
export interface LoadedScheduledAt {
  local: string;
  iso: string | null;
}

export const mapInterviewFormToApiInput = (
  values: InterviewFormValues,
  loaded?: LoadedScheduledAt,
): InterviewInputDraft => {
  const round = values.round.trim();
  const unchangedDate =
    loaded !== undefined &&
    loaded.iso !== null &&
    values.scheduledAt === loaded.local;
  return {
    type: values.type,
    // An emptied «Ronda» is left out: the API assigns the next number (D-09).
    ...(round !== "" ? { round: Number(round) } : {}),
    // The control holds local time; the API stores UTC. A value that does not parse goes on as it
    // is, so the schema reports it under the field instead of the date being dropped (T-04-08).
    scheduledAt:
      values.scheduledAt === ""
        ? null
        : unchangedDate
          ? loaded.iso
          : (localInputToIso(values.scheduledAt) ?? values.scheduledAt),
    mode: values.mode,
    outcome: values.outcome,
    // The contract trims but keeps "": a blank note is sent as null.
    notes: values.notes.trim() === "" ? null : values.notes,
  };
};

const isInterviewFormField = (name: unknown): name is InterviewFormField =>
  name === "type" ||
  name === "round" ||
  name === "scheduledAt" ||
  name === "mode" ||
  name === "outcome" ||
  name === "notes";

// Fixed Spanish copy per field: the contracts' own text and the typed value are never shown.
const interviewFieldMessage = (field: InterviewFormField): string => {
  if (field === "type") return "Elige un tipo de ronda.";
  if (field === "round") {
    return "La ronda debe ser un número entero de 1 o más.";
  }
  if (field === "scheduledAt") return "Introduce una fecha y hora válidas.";
  if (field === "notes") return "Las notas admiten hasta 5.000 caracteres.";
  return "Revisa este campo.";
};

// Wraps the contracts schema for TanStack Form: first message per field, or undefined when valid.
// In edit mode an empty «Ronda» is an error too (D-28): the client never numbers a round, and a
// PUT without a number would keep the stored one, which the edit form does not offer.
export const validateInterviewForm = (
  values: InterviewFormValues,
  mode: InterviewFormMode = "add",
): { fields: Partial<Record<InterviewFormField, string>> } | undefined => {
  const result = interviewInputSchema.safeParse(
    mapInterviewFormToApiInput(values),
    { reportInput: true },
  );
  const fields: Partial<Record<InterviewFormField, string>> = {};
  if (mode === "edit" && values.round.trim() === "") {
    fields.round = interviewFieldMessage("round");
  }
  if (result.success) {
    return fields.round === undefined ? undefined : { fields };
  }
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (isInterviewFormField(field) && fields[field] === undefined) {
      fields[field] = interviewFieldMessage(field);
    }
  }
  return { fields };
};

export const mapApplicationFromApiToDetailVm = (
  application: Application,
): ApplicationDetailVm => {
  const salary = formatSalaryRange(
    application.salaryMin,
    application.salaryMax,
    application.currency,
  );
  return {
    id: application.id,
    title: application.title,
    company: application.company,
    location: application.location,
    status: application.status,
    salaryLine: salary === null ? null : `${salary} brutos al año`,
    appliedAtLabel: application.appliedAt
      ? formatDate(application.appliedAt)
      : null,
    sourceUrl: toSafeHttpUrl(application.sourceUrl),
    createdAtLabel: formatDate(application.createdAt),
    updatedAtLabel: formatDate(application.updatedAt),
    tagGroups: buildTagGroups(application),
    notes: application.notes,
    offerText: application.offerText,
    // Stored oldest first; the timeline shows the newest on top.
    history: application.statusHistory
      .map((entry) => ({ status: entry.status, atLabel: formatDate(entry.at) }))
      .reverse(),
    interviews: [...application.interviews]
      .sort(compareInterviews)
      .map(mapInterviewFromApiToVm),
    newInterviewValues: newInterviewFormValues(
      nextInterviewRound(application.interviews),
    ),
  };
};

// Optimistic view of a status change: the new status and its history entry (newest first) before
// the server answers. The input is never mutated; the server response replaces this view.
export const withOptimisticStatus = (
  vm: ApplicationDetailVm,
  next: ApplicationStatus,
  atLabel: string,
): ApplicationDetailVm => ({
  ...vm,
  status: next,
  history: [{ status: next, atLabel }, ...vm.history],
});
