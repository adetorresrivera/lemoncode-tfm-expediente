import type { Application, ApplicationStatus } from "@tfm/contracts";
import {
  CONTRACT_TYPE_LABELS,
  SENIORITY_LABELS,
  WORK_MODE_LABELS,
} from "@/common/lib/enum-labels";
import { formatDate, formatSalaryRange } from "@/common/lib/format";
import type {
  ApplicationDetailVm,
  DetailTagGroupVm,
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
