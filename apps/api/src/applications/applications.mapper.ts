import type { Application } from "@tfm/contracts";
import type { ApplicationDoc } from "./applications.repository.js";

// Field by field on purpose: a stored field never reaches the API unless it is named here.
export function mapApplicationDocToApi(doc: ApplicationDoc): Application {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    company: doc.company,
    location: doc.location,
    workMode: doc.workMode,
    seniority: doc.seniority,
    contractType: doc.contractType,
    salaryMin: doc.salaryMin,
    salaryMax: doc.salaryMax,
    currency: doc.currency,
    tags: doc.tags.map((tag) => ({ label: tag.label, group: tag.group })),
    sourceUrl: doc.sourceUrl,
    offerText: doc.offerText,
    // A document written without the field (older data) reads as null, like an explicit null.
    appliedAt: doc.appliedAt ? doc.appliedAt.toISOString() : null,
    notes: doc.notes,
    cvDocumentId: doc.cvDocumentId,
    coverLetterDocumentId: doc.coverLetterDocumentId,
    status: doc.status,
    statusHistory: doc.statusHistory.map((entry) => ({
      status: entry.status,
      at: entry.at.toISOString(),
    })),
    interviews: doc.interviews.map((interview) => ({
      id: interview.id,
      round: interview.round,
      type: interview.type,
      scheduledAt: interview.scheduledAt,
      mode: interview.mode,
      notes: interview.notes,
      outcome: interview.outcome,
    })),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    ownerId: doc.ownerId,
  };
}
