import type { Document, DocumentListItem } from "@tfm/contracts";
import type { DocumentDoc } from "./documents.repository.js";

// Field by field on purpose: a stored field never reaches the API unless it is named here.
export function mapDocumentDocToApi(doc: DocumentDoc): Document {
  return {
    id: doc._id.toHexString(),
    type: doc.type,
    name: doc.name,
    version: doc.version,
    fileName: doc.fileName,
    s3Key: doc.s3Key,
    mimeType: doc.mimeType,
    size: doc.size,
    createdAt: doc.createdAt.toISOString(),
  };
}

export function mapDocumentDocToListItem(
  doc: DocumentDoc,
  usedBy: number,
): DocumentListItem {
  return {
    id: doc._id.toHexString(),
    type: doc.type,
    name: doc.name,
    version: doc.version,
    fileName: doc.fileName,
    s3Key: doc.s3Key,
    mimeType: doc.mimeType,
    size: doc.size,
    createdAt: doc.createdAt.toISOString(),
    usedBy,
  };
}
