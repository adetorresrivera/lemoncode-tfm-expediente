import type { ApplicationStatus } from "@tfm/contracts";

export interface ApplicationListTag {
  label: string;
  soft: boolean;
}

export interface ApplicationListItem {
  id: string;
  title: string;
  company: string;
  location: string | null;
  status: ApplicationStatus;
  visibleTags: ApplicationListTag[];
  hiddenTagCount: number;
  salary: string | null;
  updatedAtLabel: string;
}

export interface StackTagOptionVm {
  label: string;
}

export interface StackTagsVm {
  status: "loading" | "ok" | "error";
  options: StackTagOptionVm[];
}
