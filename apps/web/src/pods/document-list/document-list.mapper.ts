import type { DocumentListItem } from "@tfm/contracts";
import { DOCUMENT_TYPE_LABELS } from "@/common/lib/enum-labels";
import { formatDate, formatFileSize } from "@/common/lib/format";
import type { HttpErrorCode } from "@/core/http/http-client";
import type { DocumentRowVm } from "./document-list.vm";

export const usageLabel = (usedBy: number): string | null => {
  if (usedBy <= 0) return null;
  return usedBy === 1
    ? "En uso en 1 candidatura"
    : `En uso en ${usedBy} candidaturas`;
};

export const countLabel = (count: number | null): string => {
  if (count === null) return "";
  if (count === 0) return "Sin documentos";
  if (count === 1) return "1 documento";
  return `${count} documentos`;
};

// Fixed copy chosen by code (D-29): the server message is never rendered. Rule 4 is the only
// refusal the user can act on; everything else gets the generic sentence.
export const deleteErrorMessage = (code: HttpErrorCode): string =>
  code === "DOCUMENT_IN_USE"
    ? "Este documento está vinculado a alguna candidatura. Desvincúlalo antes de eliminarlo."
    : "No se pudo eliminar el documento. Inténtalo de nuevo.";

export const mapDocumentFromApiToVm = (
  item: DocumentListItem,
): DocumentRowVm => ({
  id: item.id,
  name: item.name,
  version: item.version,
  type: item.type,
  typeLabel: DOCUMENT_TYPE_LABELS[item.type],
  createdAt: item.createdAt,
  dateLabel: formatDate(item.createdAt),
  sizeLabel: formatFileSize(item.size),
  usageLabel: usageLabel(item.usedBy),
  downloadHref: `/api/documents/${encodeURIComponent(item.id)}/download`,
  downloadLabel: `Descargar ${item.name}`,
  deleteLabel: `Eliminar ${item.name}`,
});

export const mapDocumentListFromApiToVm = (
  items: DocumentListItem[],
): DocumentRowVm[] => items.map(mapDocumentFromApiToVm);
