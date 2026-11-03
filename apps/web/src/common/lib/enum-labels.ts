import type {
  ApplicationStatus,
  ContractType,
  Seniority,
  TagGroup,
  WorkMode,
} from "@tfm/contracts";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  guardada: "Guardada",
  enviada: "Enviada",
  en_entrevistas: "En entrevistas",
  oferta_recibida: "Oferta recibida",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  descartada: "Descartada",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remoto: "Remoto",
  hibrido: "Híbrido",
  presencial: "Presencial",
};

export const SENIORITY_LABELS: Record<Seniority, string> = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  indefinido: "Indefinido",
  temporal: "Temporal",
  freelance: "Freelance",
  practicas: "Prácticas",
  otro: "Otro",
};

/** Display order of tag groups: card, detail and filters. */
export const TAG_GROUP_ORDER: readonly TagGroup[] = [
  "stack",
  "nice_to_have",
  "language",
];
