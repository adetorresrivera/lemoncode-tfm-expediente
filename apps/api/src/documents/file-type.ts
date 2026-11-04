import type { DOCUMENT_MIME_TYPES } from "@tfm/contracts";

export type DocumentMimeType = (typeof DOCUMENT_MIME_TYPES)[number];

export interface DetectedDocument {
  mimeType: DocumentMimeType;
  ext: ".pdf" | ".docx";
}

const PDF_MIME: DocumentMimeType = "application/pdf";
const DOCX_MIME: DocumentMimeType =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// ZIP signatures, little-endian: local header "PK\x03\x04", central entry "PK\x01\x02",
// end-of-central-directory record "PK\x05\x06".
const LOCAL_HEADER = 0x04034b50;
const CENTRAL_ENTRY = 0x02014b50;
const EOCD = 0x06054b50;
const EOCD_MIN = 22;
const CENTRAL_ENTRY_MIN = 46;
const MAX_ZIP_COMMENT = 0xffff;

// Names of the entries in the central directory, or null when the structure is not a plain ZIP
// (no end record, ZIP64 sentinels, any read out of bounds). The central directory is used rather
// than the local headers because streamed ZIPs carry no sizes in the local header. Nothing is
// decompressed, so there is no decompression-bomb exposure.
function zipEntryNames(buf: Buffer): string[] | null {
  if (buf.length < EOCD_MIN) return null;
  const lowest = Math.max(0, buf.length - EOCD_MIN - MAX_ZIP_COMMENT);
  let eocd = -1;
  for (let i = buf.length - EOCD_MIN; i >= lowest; i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const total = buf.readUInt16LE(eocd + 10);
  const directorySize = buf.readUInt32LE(eocd + 12);
  const directoryOffset = buf.readUInt32LE(eocd + 16);
  if (
    total === 0xffff ||
    directorySize === 0xffffffff ||
    directoryOffset === 0xffffffff
  ) {
    return null;
  }

  const names: string[] = [];
  let off = directoryOffset;
  for (let n = 0; n < total; n++) {
    if (off + CENTRAL_ENTRY_MIN > buf.length) return null;
    if (buf.readUInt32LE(off) !== CENTRAL_ENTRY) return null;
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    if (off + CENTRAL_ENTRY_MIN + nameLen > buf.length) return null;
    names.push(
      buf.toString(
        "utf8",
        off + CENTRAL_ENTRY_MIN,
        off + CENTRAL_ENTRY_MIN + nameLen,
      ),
    );
    off += CENTRAL_ENTRY_MIN + nameLen + extraLen + commentLen;
  }
  return names;
}

// The extension and the content must agree: a renamed file is not what its name says (D-02).
export function detectDocument(
  bytes: Uint8Array,
  fileName: string,
): DetectedDocument | null {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const lower = fileName.toLowerCase();

  if (
    lower.endsWith(".pdf") &&
    buf.length >= 5 &&
    buf.subarray(0, 5).toString("latin1") === "%PDF-"
  ) {
    return { mimeType: PDF_MIME, ext: ".pdf" };
  }

  if (
    lower.endsWith(".docx") &&
    buf.length >= 4 &&
    buf.readUInt32LE(0) === LOCAL_HEADER &&
    zipEntryNames(buf)?.includes("word/document.xml")
  ) {
    return { mimeType: DOCX_MIME, ext: ".docx" };
  }

  return null;
}
