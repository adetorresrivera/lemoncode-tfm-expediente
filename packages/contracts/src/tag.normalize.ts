import { MAX_TAGS, type Tag } from "./tag.schema.js";

/** NFC, trimmed, every whitespace run collapsed to one space. Nothing else is touched. */
export function normalizeTagLabel(label: string): string {
  return label.normalize("NFC").trim().replace(/\s+/gu, " ");
}

/** Identity of a tag: the normalized label lower-cased (Unicode-aware, locale independent). */
export const tagKey = (label: string): string =>
  normalizeTagLabel(label).toLowerCase();

/**
 * Normalizes a tag list: empty labels dropped, duplicates merged across all groups
 * (the first spelling and its group win), original order kept, at most MAX_TAGS.
 */
export function normalizeTags(tags: readonly Tag[]): Tag[] {
  const seen = new Set<string>();
  const result: Tag[] = [];
  for (const tag of tags) {
    const label = normalizeTagLabel(tag.label);
    if (label === "") continue;
    const key = tagKey(label);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ label, group: tag.group });
    if (result.length === MAX_TAGS) break;
  }
  return result;
}
