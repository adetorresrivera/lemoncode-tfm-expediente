import { ObjectId } from "mongodb";
import { ApiError } from "../errors.js";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

// A path parameter cannot identify anything unless it is exactly 24 hexadecimal characters
// (either case). Anything else answers the same 404 as an unknown id, so there is no oracle and
// an unchecked ObjectId constructor call never surfaces as a 500.
export function parseObjectId(raw: string): ObjectId {
  if (!OBJECT_ID_PATTERN.test(raw)) {
    throw new ApiError(404, "NOT_FOUND", "Candidatura no encontrada");
  }
  return new ObjectId(raw);
}
