import type { DocumentType } from "@tfm/contracts";
import { useState } from "react";
import { DocumentUploadComponent } from "./document-upload.component";
import { useDocumentUpload } from "./document-upload.hooks";
import type { UploadLiveMessage } from "./document-upload.vm";

interface Props {
  // The active /documents filter; the dialog opens with this type selected (default CV).
  initialType?: DocumentType;
  onUploaded?: (uploaded: { id: string; type: DocumentType }) => void;
}

const LOADING_MESSAGE = "Subiendo el archivo…";
const CANCELLED_MESSAGE = "Subida cancelada.";
const SUCCESS_MESSAGE = "Documento subido.";

// Generic mode: «Subir documento» opens the dialog and the new document is reported through
// `onUploaded` once the server answered 201.
export function DocumentUploadContainer({
  initialType = "cv",
  onUploaded,
}: Props) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [outcome, setOutcome] = useState<UploadLiveMessage | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { upload, cancel } = useDocumentUpload();

  // Loading is derived from the request in flight; the stored outcome is the last failure or
  // cancellation of an upload that already ended.
  const liveMessage: UploadLiveMessage | null = uploading
    ? { kind: "loading", message: LOADING_MESSAGE }
    : outcome;

  return (
    <DocumentUploadComponent
      open={open}
      onOpen={() => {
        setOutcome(null);
        setOpen(true);
      }}
      onClose={() => setOpen(false)}
      initialType={initialType}
      uploading={uploading}
      liveMessage={liveMessage}
      successMessage={success}
      onCancel={cancel}
      handlers={{
        upload,
        onStart: () => {
          setOutcome(null);
          setUploading(true);
        },
        onUploaded: (uploaded) => {
          setOpen(false);
          setSuccess(SUCCESS_MESSAGE);
          onUploaded?.(uploaded);
        },
        onCancelled: () =>
          setOutcome({ kind: "cancelled", message: CANCELLED_MESSAGE }),
        onFailed: (message) => setOutcome({ kind: "error", message }),
        onSettled: () => setUploading(false),
      }}
    />
  );
}
