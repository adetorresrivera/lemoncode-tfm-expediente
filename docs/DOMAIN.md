# Dominio

## Glosario
| Término (UI) | Código | Definición |
|---|---|---|
| Candidatura / expediente | `Application` | Un proceso de selección para una oferta concreta. Incluye los datos de la oferta. |
| Oferta | campos de `Application` | Puesto, empresa, condiciones. No es entidad propia. |
| Estado | `ApplicationStatus` | Fase del proceso. Lista fija. |
| Historial de estados | `statusHistory` | Registro de cada cambio de estado con su fecha. |
| Ronda de entrevista | `Interview` | Una entrevista o prueba dentro del proceso. Puede haber varias. |
| Etiqueta | `Tag` | Palabra clave agrupada que describe la oferta. |
| Documento | `Document` | CV o carta de presentación almacenado en S3. |
| Borrador IA | `OfferExtraction` | Propuesta de campos generada a partir del texto de la oferta. Nunca se guarda sola. |

## Enumeraciones (en `packages/contracts`)
```ts
ApplicationStatus = "guardada" | "enviada" | "en_entrevistas" | "oferta_recibida"
                  | "aceptada" | "rechazada" | "descartada"
WorkMode          = "remoto" | "hibrido" | "presencial"
Seniority         = "junior" | "mid" | "senior" | "lead"
ContractType      = "indefinido" | "temporal" | "freelance" | "practicas" | "otro"
TagGroup          = "stack" | "nice_to_have" | "language"
InterviewType     = "rrhh" | "tecnica" | "prueba_tecnica" | "manager" | "cultural" | "otra"
InterviewMode     = "online" | "presencial" | "telefono"
InterviewOutcome  = "pendiente" | "superada" | "no_superada"
DocumentType      = "cv" | "carta"
```

Etiquetas de UI de los estados: Guardada, Enviada, En entrevistas, Oferta recibida, Aceptada, Rechazada, Descartada. Terminales: `aceptada`, `rechazada`, `descartada`.

## Entidades

### Application (colección `applications`)
| Campo | Tipo | Notas |
|---|---|---|
| id | string | ObjectId serializado |
| title | string | **obligatorio**, 2–120 |
| company | string | **obligatorio**, 1–120 |
| location | string \| null | |
| workMode | WorkMode \| null | |
| seniority | Seniority \| null | |
| contractType | ContractType \| null | |
| salaryMin, salaryMax | number \| null | anual bruto; si ambos, `salaryMin ≤ salaryMax` |
| currency | string \| null | ISO 4217, por defecto `EUR` al mostrar |
| tags | Tag[] | `{ label, group }`; máx. 20; sin duplicados por `label` normalizado |
| sourceUrl | string \| null | URL válida |
| offerText | string \| null | texto pegado, máx. 20.000 |
| status | ApplicationStatus | por defecto `guardada` |
| statusHistory | `{ status, at }[]` | primera entrada al crear |
| appliedAt | string (ISO) \| null | |
| notes | string \| null | máx. 5.000 |
| interviews | Interview[] | embebidas |
| cvDocumentId | string \| null | ref. a `documents` |
| coverLetterDocumentId | string \| null | ref. a `documents` |
| createdAt, updatedAt | string (ISO) | |
| ownerId | string \| null | reservado para multiusuario; siempre `null` en el MVP |

### Interview (embebida)
`{ id, round, type, scheduledAt (ISO|null), mode, notes|null, outcome }`. `round` se asigna automáticamente (máx. actual + 1) y se puede editar.

### Document (colección `documents`)
`{ id, type, name, version, s3Key, mimeType, size, createdAt }`. `version` es texto libre (p. ej. «v3», «Frontend 2026»). Objeto en bucket `tfm-assets`, clave `documents/<id>/<filename-saneado>`.

### Tag
`{ label: string (1–40), group: TagGroup }`. Normalización al guardar: `trim`, espacios colapsados, sin duplicados comparando en minúsculas. Se conserva la grafía de la primera aparición (`React`, `C#`, `.NET 8`).

## Reglas de negocio
1. **Transiciones libres**: cualquier estado puede pasar a cualquier otro. Cada cambio añade `{ status, at: now }` a `statusHistory` (si el estado no cambia, no se añade).
2. Al pasar a `enviada` por primera vez, si `appliedAt` es `null`, se fija a ahora.
3. Al añadir una ronda de entrevista, si el estado es `enviada`, pasa automáticamente a `en_entrevistas` (con entrada en el historial).
4. No se puede borrar un documento vinculado a alguna candidatura (409 `DOCUMENT_IN_USE`).
5. Borrar una candidatura pide confirmación y no borra sus documentos.
6. El borrador IA **solo rellena campos vacíos** del formulario; las etiquetas se fusionan sin duplicados. Nada se persiste hasta que el usuario guarda.
7. `updatedAt` se actualiza en cualquier cambio, incluidas rondas y estado.

## Mapeo estado → design system
| Estado | Token visual | Icono lucide |
|---|---|---|
| guardada | `status-saved` | `Bookmark` |
| enviada | `status-sent` | `Send` |
| en_entrevistas | `status-interview` | `MessagesSquare` |
| oferta_recibida | `status-offer` | `BadgeCheck` |
| aceptada | `status-offer` | `Trophy` |
| rechazada | `status-rejected` | `CircleX` |
| descartada | `status-rejected` | `Ban` |
