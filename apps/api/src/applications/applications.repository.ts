import type {
  ApplicationStatus,
  ContractType,
  Interview,
  Seniority,
  TagGroup,
  WorkMode,
} from "@tfm/contracts";
import type { Db, ObjectId } from "mongodb";

// Stored tag: the contract Tag plus its normalized identity (tagKey(label)), never sent to the API.
export interface TagDoc {
  label: string;
  group: TagGroup;
  key: string;
}

export interface TagCount {
  label: string;
  group: TagGroup;
  count: number;
  key: string;
}

// BSON shape of the applications collection: ObjectId ids and Date instants.
// The contract (Application) is derived from it by applications.mapper.ts.
export interface ApplicationDoc {
  _id: ObjectId;
  title: string;
  company: string;
  location: string | null;
  workMode: WorkMode | null;
  seniority: Seniority | null;
  contractType: ContractType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  sourceUrl: string | null;
  offerText: string | null;
  notes: string | null;
  cvDocumentId: string | null;
  coverLetterDocumentId: string | null;
  tags: TagDoc[];
  status: ApplicationStatus;
  statusHistory: { status: ApplicationStatus; at: Date }[];
  appliedAt: Date | null;
  interviews: Interview[]; // always [] in Phase 2; Phase 4 owns its storage
  createdAt: Date;
  updatedAt: Date;
  ownerId: null;
}

export type NewApplicationDoc = Omit<ApplicationDoc, "_id">;

export interface ApplicationsRepository {
  insert(doc: NewApplicationDoc): Promise<ApplicationDoc>;
  list(): Promise<ApplicationDoc[]>;
  tagSummaries(): Promise<TagCount[]>;
}

export function createApplicationsRepository(db: Db): ApplicationsRepository {
  const collection = db.collection<ApplicationDoc>("applications");
  // The same collection typed without _id: insertOne then lets the driver generate it.
  const insertions = db.collection<NewApplicationDoc>("applications");

  return {
    async insert(doc) {
      const { insertedId } = await insertions.insertOne({ ...doc });
      return { ...doc, _id: insertedId };
    },
    async list() {
      return collection.find({}).sort({ updatedAt: -1, _id: -1 }).toArray();
    },
    // One row per (stored key, group). The key already merges case variants, so no server-side
    // lower-casing is needed (it would be ASCII-only). The label is the oldest application's.
    async tagSummaries() {
      return collection
        .aggregate<TagCount>([
          { $sort: { createdAt: 1, _id: 1 } },
          { $unwind: "$tags" },
          {
            $group: {
              _id: { key: "$tags.key", group: "$tags.group" },
              label: { $first: "$tags.label" },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              label: 1,
              group: "$_id.group",
              key: "$_id.key",
              count: 1,
            },
          },
        ])
        .toArray();
    },
  };
}
