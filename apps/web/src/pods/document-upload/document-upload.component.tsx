import type { DocumentType } from "@tfm/contracts";
import { Upload } from "lucide-react";
import { useRef } from "react";
import { RequestStatus } from "@/common/components/request-status";
import { Button } from "@/common/components/ui/button";
import { UploadDialog } from "./components/upload-dialog";
import type { UploadFormHandlers } from "./document-upload.hooks";
import type { UploadLiveMessage } from "./document-upload.vm";

interface Props {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  initialType: DocumentType;
  uploading: boolean;
  // The dialog's polite line: loading, cancelled or a failure that belongs to no field.
  liveMessage: UploadLiveMessage | null;
  // The page-level polite line next to the opener.
  successMessage: string | null;
  handlers: UploadFormHandlers;
  onCancel: () => void;
}

// The «Subir documento» opener, its always-mounted polite line and the upload dialog.
export function DocumentUploadComponent({
  open,
  onOpen,
  onClose,
  initialType,
  uploading,
  liveMessage,
  successMessage,
  handlers,
  onCancel,
}: Props) {
  // Radix returns focus only to a Trigger; the dialog is controlled and trigger-less, so the
  // opener is stored on click and focused again in `onCloseAutoFocus`.
  const openerRef = useRef<HTMLElement | null>(null);

  return (
    <>
      <Button
        type="button"
        className="h-11 w-full sm:w-auto"
        onClick={(event) => {
          openerRef.current = event.currentTarget;
          onOpen();
        }}
      >
        <Upload aria-hidden="true" strokeWidth={1.5} className="size-4" />
        Subir documento
      </Button>
      <div role="status" aria-live="polite" className="sm:basis-full">
        {successMessage !== null ? (
          <RequestStatus kind="success" message={successMessage} />
        ) : null}
      </div>
      <UploadDialog
        open={open}
        onClose={onClose}
        initialType={initialType}
        uploading={uploading}
        liveMessage={liveMessage}
        handlers={handlers}
        onCancel={onCancel}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const opener = openerRef.current;
          if (opener?.isConnected === true) opener.focus();
        }}
      />
    </>
  );
}
