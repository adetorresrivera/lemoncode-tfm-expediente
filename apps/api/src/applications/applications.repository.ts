import type {
  ApplicationQuery,
  ApplicationStatus,
  ContractType,
  Interview,
  Seniority,
  TagGroup,
  WorkMode,
} from "@tfm/contracts";
import type { Db, ObjectId } from "mongodb";
import {
  buildApplicationsFilter,
  buildApplicationsSort,
} from "./applications.query.js";

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
  list(query: ApplicationQuery): Promise<ApplicationDoc[]>;
  findById(id: ObjectId): Promise<ApplicationDoc | null>;
  tagSummaries(): Promise<TagCount[]>;
  // Null when the id is unknown OR the status is already `status` (nothing written).
  changeStatus(
    id: ObjectId,
    status: ApplicationStatus,
    now: Date,
  ): Promise<ApplicationDoc | null>;
  // True when one application was deleted. Only the applications collection is touched: stored
  // documents are never deleted or unlinked here (APP-03).
  deleteById(id: ObjectId): Promise<boolean>;
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
    // No limit or skip: the list is complete by design (D-10).
    async list(query) {
      return collection
        .find(buildApplicationsFilter(query))
        .sort(buildApplicationsSort(query.sort))
        .toArray();
    },
    async findById(id) {
      return collection.findOne({ _id: id });
    },
    // One atomic pipeline update guarded by `status: { $ne }`: the status, its history entry,
    // appliedAt and updatedAt change together or not at all, and concurrent identical moves write
    // one entry. appliedAt is only filled on a move to enviada while it is null or missing. No
    // insert-on-miss option: a deleted application is never recreated.
    async changeStatus(id, status, now) {
      return collection.findOneAndUpdate(
        { _id: id, status: { $ne: status } },
        [
          {
            $set: {
              status: { $literal: status },
              statusHistory: {
                $concatArrays: [
                  "$statusHistory",
                  [{ status: { $literal: status }, at: now }],
                ],
              },
              appliedAt:
                status === "enviada"
                  ? {
                      $cond: [
                        { $eq: [{ $ifNull: ["$appliedAt", null] }, null] },
                        now,
                        "$appliedAt",
                      ],
                    }
                  : "$appliedAt",
              updatedAt: now,
            },
          },
        ],
        { returnDocument: "after" },
      );
    },
    async deleteById(id) {
      const { deletedCount } = await collection.deleteOne({ _id: id });
      return deletedCount === 1;
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
