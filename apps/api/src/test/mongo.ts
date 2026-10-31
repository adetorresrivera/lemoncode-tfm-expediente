import { MongoClient, type Db } from "mongodb";
import { ensureIndexes } from "../db/mongo.js";

export const TEST_DB_NAME = "tfm_test";

const TEST_COLLECTIONS = ["applications", "documents"] as const;

export interface TestDb {
  db: Db;
  reset(): Promise<void>;
  close(): Promise<void>;
}

// Integration tests run on real Mongo, always against the database named tfm_test and never
// against the development database in MONGO_URL (its path is /tfm, real data).
export async function useTestDb(): Promise<TestDb> {
  const url = process.env.MONGO_URL;
  if (!url) {
    throw new Error(
      "MONGO_URL is required for API integration tests (devcontainer)",
    );
  }
  const client = new MongoClient(url, { serverSelectionTimeoutMS: 3000 });
  await client.connect();
  const db = client.db(TEST_DB_NAME);
  if (db.databaseName !== TEST_DB_NAME) {
    await client.close();
    throw new Error(`Refusing to use a database other than ${TEST_DB_NAME}`);
  }
  await ensureIndexes(db);

  return {
    db,
    reset: async () => {
      await Promise.all(
        TEST_COLLECTIONS.map((name) => db.collection(name).deleteMany({})),
      );
    },
    close: async () => {
      await client.close();
    },
  };
}
