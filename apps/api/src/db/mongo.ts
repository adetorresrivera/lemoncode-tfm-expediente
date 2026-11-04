import { MongoClient, type Db } from "mongodb";

export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection("applications").createIndexes([
    { key: { status: 1 }, name: "status_1" },
    { key: { updatedAt: -1 }, name: "updatedAt_-1" },
    { key: { "tags.label": 1 }, name: "tags.label_1" },
    // Backs the stack filter ($all on the stored normalized key).
    { key: { "tags.key": 1 }, name: "tags.key_1" },
    // Titles are mixed ES/EN: no language-specific stemming (cannot change later without IndexOptionsConflict).
    {
      key: { title: "text", company: "text" },
      name: "title_company_text",
      default_language: "none",
    },
    // Back the rule 4 in-use check and the usedBy count of the documents library.
    { key: { cvDocumentId: 1 }, name: "cvDocumentId_1" },
    { key: { coverLetterDocumentId: 1 }, name: "coverLetterDocumentId_1" },
  ]);
  await db
    .collection("documents")
    .createIndexes([{ key: { createdAt: -1 }, name: "createdAt_-1" }]);
}

export async function connectMongo(
  url: string,
): Promise<{ client: MongoClient; db: Db }> {
  const client = new MongoClient(url, {
    serverSelectionTimeoutMS: 3000,
    connectTimeoutMS: 3000,
  });
  await client.connect();
  const db = client.db(); // database name comes from the URL path (/tfm)
  await ensureIndexes(db);
  return { client, db };
}

export async function pingMongo(db: Db): Promise<boolean> {
  try {
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
