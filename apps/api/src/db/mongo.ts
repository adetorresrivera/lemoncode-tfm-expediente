import { MongoClient, type Db } from "mongodb";

export async function connectMongo(url: string): Promise<{ client: MongoClient; db: Db }> {
  const client = new MongoClient(url, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 });
  await client.connect();
  const db = client.db(); // database name comes from the URL path (/tfm)
  await db.collection("applications").createIndexes([
    { key: { status: 1 }, name: "status_1" },
    { key: { updatedAt: -1 }, name: "updatedAt_-1" },
    { key: { "tags.label": 1 }, name: "tags.label_1" },
    // Titles are mixed ES/EN: no language-specific stemming (cannot change later without IndexOptionsConflict).
    {
      key: { title: "text", company: "text" },
      name: "title_company_text",
      default_language: "none",
    },
  ]);
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
