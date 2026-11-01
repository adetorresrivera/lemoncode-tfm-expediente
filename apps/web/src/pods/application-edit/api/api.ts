import {
  applicationSchema,
  offerExtractionSchema,
  type Application,
  type ApplicationInput,
  type OfferExtraction,
} from "@tfm/contracts";
import { request } from "@/core/http/http-client";

// The input is the schema-validated draft (trimmed, defaults applied); the server validates it
// again with the same schema.
export const createApplication = (
  input: ApplicationInput,
): Promise<Application> =>
  request("/api/applications", applicationSchema, {
    method: "POST",
    body: input,
  });

// The id comes from the URL, so it is encoded before it reaches the API path. Own copy: a pod
// never imports another pod.
export const getApplication = (
  id: string,
  signal?: AbortSignal,
): Promise<Application> =>
  request(`/api/applications/${encodeURIComponent(id)}`, applicationSchema, {
    signal,
  });

// Sends the pasted offer to the extraction endpoint. Nothing is stored server side: the draft is
// saved only through the form (AI-06). Own copy: a pod never imports another pod.
export const extractOffer = (
  text: string,
  signal?: AbortSignal,
): Promise<OfferExtraction> =>
  request("/api/offers/extract", offerExtractionSchema, {
    method: "POST",
    body: { text },
    signal,
  });

// PUT replaces the editable fields only; the server never touches status, history or documents.
export const updateApplication = (
  id: string,
  input: ApplicationInput,
): Promise<Application> =>
  request(`/api/applications/${encodeURIComponent(id)}`, applicationSchema, {
    method: "PUT",
    body: input,
  });
