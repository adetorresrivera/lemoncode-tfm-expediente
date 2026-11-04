import type { DocumentType } from "@tfm/contracts";

export interface DocumentRowVm {
  id: string;
  name: string;
  version: string;
  type: DocumentType;
  typeLabel: string;
  createdAt: string;
  dateLabel: string;
  sizeLabel: string;
  usageLabel: string | null;
  downloadHref: string;
  downloadLabel: string;
  deleteLabel: string;
}

export type DocumentDeleteState =
  | { status: "idle" }
  | { status: "deleting" }
  | { status: "error"; message: string };
