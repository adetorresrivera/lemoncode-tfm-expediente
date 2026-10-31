import type {
  ApplicationStatus,
  ContractType,
  Interview,
  Seniority,
  Tag,
  WorkMode,
} from "@tfm/contracts";
import type { Db, ObjectId } from "mongodb";

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
  tags: Tag[];
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
  };
}
