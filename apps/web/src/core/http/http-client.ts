import { errorResponseSchema, type ErrorCode } from "@tfm/contracts";
import type { z } from "zod";

export type HttpErrorCode = ErrorCode | "NETWORK_ERROR" | "INVALID_RESPONSE";

export class HttpError extends Error {
  readonly status: number;
  readonly code: HttpErrorCode;
  readonly details?: unknown;

  constructor(
    status: number,
    code: HttpErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

const NETWORK_MESSAGE = "No se pudo conectar con el servidor";
const INVALID_RESPONSE_MESSAGE = "Respuesta inesperada del servidor";

const isAbortError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  error.name === "AbortError";

const invalidResponse = (status: number) =>
  new HttpError(status, "INVALID_RESPONSE", INVALID_RESPONSE_MESSAGE);

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw invalidResponse(response.status);
  }
};

const readJsonOrUndefined = async (response: Response): Promise<unknown> => {
  try {
    return await readJson(response);
  } catch (error) {
    if (isAbortError(error)) throw error;
    return undefined;
  }
};

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, signal } = options;
  const init: RequestInit = { method, signal };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(path, init);
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new HttpError(0, "NETWORK_ERROR", NETWORK_MESSAGE);
  }

  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(
      await readJsonOrUndefined(response),
    );
    if (!parsed.success) throw invalidResponse(response.status);
    const { code, message, details } = parsed.data.error;
    throw new HttpError(response.status, code, message, details);
  }

  const payload =
    response.status === 204 ? undefined : await readJson(response);
  const result = schema.safeParse(payload);
  if (!result.success) throw invalidResponse(response.status);
  return result.data;
}
