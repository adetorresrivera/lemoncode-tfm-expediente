import {
  applicationStatusSchema,
  type ApplicationStatus,
} from "@tfm/contracts";
import { useId } from "react";
import { RequestStatus } from "@/common/components/request-status";
import { Label } from "@/common/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/common/components/ui/native-select";
import { STATUS_LABELS } from "@/common/lib/enum-labels";
import type { StatusFeedback } from "../application-detail.vm";

interface Props {
  value: ApplicationStatus;
  pending: boolean;
  // Another change of the detail (a round) is saving: the select is unavailable but not busy,
  // because its own value is not what is being saved.
  locked: boolean;
  feedback: StatusFeedback | null;
  onChange: (next: ApplicationStatus) => void;
}

// While pending the select is aria-busy and aria-disabled, never disabled: a disabled select
// drops keyboard focus. While locked it is aria-disabled only. The feedback slot is always
// mounted so its text change is announced.
export function StatusChange({
  value,
  pending,
  locked,
  feedback,
  onChange,
}: Props) {
  const selectId = useId();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
      <div className="flex w-full flex-col gap-1 sm:w-56">
        <Label htmlFor={selectId}>Cambiar estado</Label>
        <NativeSelect
          id={selectId}
          value={value}
          aria-busy={pending}
          aria-disabled={pending || locked}
          onChange={(event) => {
            const parsed = applicationStatusSchema.safeParse(
              event.target.value,
            );
            if (parsed.success) onChange(parsed.data);
          }}
        >
          {applicationStatusSchema.options.map((status) => (
            <NativeSelectOption key={status} value={status}>
              {STATUS_LABELS[status]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div
        role="status"
        aria-live="polite"
        className="min-w-0 sm:flex sm:min-h-11 sm:items-center"
      >
        {feedback ? (
          <RequestStatus kind={feedback.kind} message={feedback.message} />
        ) : null}
      </div>
    </div>
  );
}
