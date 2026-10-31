import type { Application, ApplicationInput } from "@tfm/contracts";
import { mapApplicationDocToApi } from "./applications.mapper.js";
import type {
  ApplicationsRepository,
  NewApplicationDoc,
} from "./applications.repository.js";

export interface ApplicationsService {
  list(): Promise<Application[]>;
  create(input: ApplicationInput): Promise<Application>;
}

export function createApplicationsService(
  repository: ApplicationsRepository,
  now: () => Date = () => new Date(),
): ApplicationsService {
  return {
    async list() {
      const docs = await repository.list();
      return docs.map(mapApplicationDocToApi);
    },

    async create(input) {
      const at = now();
      // Built field by field (no spread): id, createdAt, statusHistory, interviews and ownerId
      // sent by the client can never reach Mongo.
      const doc: NewApplicationDoc = {
        title: input.title,
        company: input.company,
        location: input.location,
        workMode: input.workMode,
        seniority: input.seniority,
        contractType: input.contractType,
        salaryMin: input.salaryMin,
        salaryMax: input.salaryMax,
        currency: input.currency,
        sourceUrl: input.sourceUrl,
        offerText: input.offerText,
        notes: input.notes,
        cvDocumentId: input.cvDocumentId,
        coverLetterDocumentId: input.coverLetterDocumentId,
        tags: input.tags.map((tag) => ({ label: tag.label, group: tag.group })),
        status: input.status,
        statusHistory: [{ status: input.status, at }],
        appliedAt:
          input.appliedAt !== null
            ? new Date(input.appliedAt)
            : input.status === "enviada"
              ? at
              : null,
        interviews: [],
        createdAt: at,
        updatedAt: at,
        ownerId: null,
      };
      return mapApplicationDocToApi(await repository.insert(doc));
    },
  };
}
