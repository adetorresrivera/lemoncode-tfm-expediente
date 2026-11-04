import type { DocumentType } from "@tfm/contracts";
import { useEffect, useRef, useState } from "react";
import { DocumentPicker } from "./components/document-picker";
import { UploadDialog } from "./components/upload-dialog";
import { DocumentUploadComponent } from "./document-upload.component";
import { useDocumentOptions, useDocumentUpload } from "./document-upload.hooks";
import type { UploadLiveMessage } from "./document-upload.vm";

interface GenericProps {
  type?: undefined;
  // The active /documents filter; the dialog opens with this type selected (default CV).
  initialType?: DocumentType;
  onUploaded?: (uploaded: { id: string; type: DocumentType }) => void;
}

interface PickerProps {
  type: DocumentType;
  // The id of the linked document, "" when there is none.
  selectedId: string;
  onSelected: (id: string) => void;
  // The first error of the form field, shown under the select.
  error?: string;
}

type Props = GenericProps | PickerProps;

const LOADING_MESSAGE = "Subiendo el archivo…";
const CANCELLED_MESSAGE = "Subida cancelada.";
const SUCCESS_MESSAGE = "Documento subido.";
const SUCCESS_VISIBLE_MS = 5000;

// Generic mode: «Subir documento» opens the dialog and the new document is reported through
// `onUploaded` once the server answered 201.
function GenericUpload({ initialType = "cv", onUploaded }: GenericProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [outcome, setOutcome] = useState<UploadLiveMessage | null>(null);
  // An object per upload so a second upload restarts the timer.
  const [success, setSuccess] = useState<object | null>(null);
  const { upload, cancel } = useDocumentUpload();

  useEffect(() => {
    if (success === null) return undefined;
    const timer = setTimeout(() => setSuccess(null), SUCCESS_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [success]);

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
      successMessage={success === null ? null : SUCCESS_MESSAGE}
      onCancel={cancel}
      handlers={{
        upload,
        onStart: () => {
          setOutcome(null);
          setUploading(true);
        },
        onUploaded: (uploaded) => {
          setOpen(false);
          setSuccess({});
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

// Picker mode: the select of the library documents of one type, used by the application form,
// plus «Subir nuevo»: the same upload dialog with the type fixed. The uploaded document is added
// to the options and selected; it is never removed from here (D-21).
function PickerUpload({ type, selectedId, onSelected, error }: PickerProps) {
  const options = useDocumentOptions(type);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [outcome, setOutcome] = useState<UploadLiveMessage | null>(null);
  const [success, setSuccess] = useState<object | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const { upload, cancel } = useDocumentUpload();

  useEffect(() => {
    if (success === null) return undefined;
    const timer = setTimeout(() => setSuccess(null), SUCCESS_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [success]);

  const liveMessage: UploadLiveMessage | null = uploading
    ? { kind: "loading", message: LOADING_MESSAGE }
    : outcome;

  return (
    <>
      <DocumentPicker
        type={type}
        selectedId={selectedId}
        onSelected={onSelected}
        error={error}
        options={options}
        uploadNewDisabled={options.status === "loading"}
        successMessage={success === null ? null : SUCCESS_MESSAGE}
        onUploadNew={(opener) => {
          openerRef.current = opener;
          setOutcome(null);
          setOpen(true);
        }}
      />
      <UploadDialog
        open={open}
        onClose={() => setOpen(false)}
        fixedType={type}
        initialType={type}
        uploading={uploading}
        liveMessage={liveMessage}
        onCancel={cancel}
        // Radix returns focus only to a Trigger; this dialog has none.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const opener = openerRef.current;
          if (opener?.isConnected === true) opener.focus();
        }}
        handlers={{
          upload,
          onStart: () => {
            setOutcome(null);
            setUploading(true);
          },
          onUploaded: (uploaded) => {
            options.add({ id: uploaded.id, label: uploaded.label });
            onSelected(uploaded.id);
            setOpen(false);
            setSuccess({});
          },
          onCancelled: () =>
            setOutcome({ kind: "cancelled", message: CANCELLED_MESSAGE }),
          onFailed: (message) => setOutcome({ kind: "error", message }),
          onSettled: () => setUploading(false),
        }}
      />
    </>
  );
}

export function DocumentUploadContainer(props: Props) {
  if (props.type !== undefined) return <PickerUpload {...props} />;
  return <GenericUpload {...props} />;
}
