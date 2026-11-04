import type { DetectedDocument } from "./file-type.js";

// Same bound as the contract (zod counts UTF-16 units, so does String.length).
export const FILE_NAME_MAX = 255;

const EXTENSION_MAX = 10;
const S3_KEY_NAME_MAX = 100;

function isHighSurrogate(unit: number): boolean {
  return unit >= 0xd800 && unit <= 0xdbff;
}

// The browser name reduced to something safe to store and show: basename only, no control
// characters, at most FILE_NAME_MAX units with its extension kept. Null when nothing is left.
export function sanitizeFileName(raw: string): string | null {
  const afterSlash = raw.slice(
    Math.max(raw.lastIndexOf("/"), raw.lastIndexOf("\\")) + 1,
  );
  const name = afterSlash.replace(/\p{Cc}/gu, "").trim();
  if (name === "") return null;
  if (name.length <= FILE_NAME_MAX) return name;

  const dot = name.lastIndexOf(".");
  const ext =
    dot > 0 && name.length - dot <= EXTENSION_MAX ? name.slice(dot) : "";
  let stem = name
    .slice(0, name.length - ext.length)
    .slice(0, FILE_NAME_MAX - ext.length);
  // Never leave half of a surrogate pair at the cut.
  if (stem.length > 0 && isHighSurrogate(stem.charCodeAt(stem.length - 1))) {
    stem = stem.slice(0, -1);
  }
  const cut = `${stem.trimEnd()}${ext}`;
  return cut === "" ? null : cut;
}

// D-07: documents/<id>/<slug><ext>. The slug only holds [a-z0-9._-], never ".." and never
// starts or ends with "-" or ".", so the key cannot leave the id segment.
export function buildS3Key(
  id: string,
  fileName: string,
  ext: DetectedDocument["ext"],
): string {
  const dot = fileName.lastIndexOf(".");
  const stem = dot >= 0 ? fileName.slice(0, dot) : fileName;
  const clean = (value: string): string =>
    value
      .replace(/[^a-z0-9._-]/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/\.{2,}/g, ".")
      .replace(/^[-.]+|[-.]+$/g, "");

  const slug = clean(
    stem.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase(),
  );
  const cut = clean(slug.slice(0, S3_KEY_NAME_MAX - ext.length));
  return `documents/${id}/${cut === "" ? "document" : cut}${ext}`;
}

// Printable ASCII only: Headers throws a ByteString TypeError on anything above 255.
const asciiFallback = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\x20-\x7e]|["\\%]/g, "_");

// RFC 5987 attr-char: encodeURIComponent leaves ' ( ) * alone, so they are escaped by hand.
const rfc5987 = (value: string): string =>
  encodeURIComponent(value).replace(
    /['()*]/g,
    (char) => "%" + char.charCodeAt(0).toString(16).toUpperCase(),
  );

export function contentDisposition(fileName: string): string {
  return `attachment; filename="${asciiFallback(fileName)}"; filename*=UTF-8''${rfc5987(fileName)}`;
}
