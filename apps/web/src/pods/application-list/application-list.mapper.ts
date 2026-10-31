import type { Application } from "@tfm/contracts";
import { TAG_GROUP_ORDER } from "@/common/lib/enum-labels";
import { formatDate, formatSalaryRange } from "@/common/lib/format";
import type { ApplicationListItem } from "./application-list.vm";

const MAX_VISIBLE_TAGS = 3;

// Stack first, then nice_to_have, then language; stored order inside each group.
const orderTags = (tags: Application["tags"]): Application["tags"] =>
  TAG_GROUP_ORDER.flatMap((group) => tags.filter((tag) => tag.group === group));

export const mapApplicationFromApiToVm = (
  application: Application,
): ApplicationListItem => {
  const ordered = orderTags(application.tags);
  return {
    id: application.id,
    title: application.title,
    company: application.company,
    location: application.location,
    status: application.status,
    visibleTags: ordered.slice(0, MAX_VISIBLE_TAGS).map((tag) => ({
      label: tag.label,
      soft: tag.group === "nice_to_have",
    })),
    hiddenTagCount: Math.max(0, ordered.length - MAX_VISIBLE_TAGS),
    salary: formatSalaryRange(
      application.salaryMin,
      application.salaryMax,
      application.currency,
    ),
    updatedAtLabel: formatDate(application.updatedAt),
  };
};

export const mapApplicationListFromApiToVm = (
  applications: Application[],
): ApplicationListItem[] => applications.map(mapApplicationFromApiToVm);
