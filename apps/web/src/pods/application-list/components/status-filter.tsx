import {
  applicationStatusSchema,
  type ApplicationStatus,
} from "@tfm/contracts";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/common/components/ui/toggle-group";
import { STATUS_LABELS } from "@/common/lib/enum-labels";

interface Props {
  value: ApplicationStatus[];
  onChange: (next: ApplicationStatus[]) => void;
}

// Radix reports the pressed values of a multiple group in the order they were pressed; the URL
// keeps that order as typed, so the list follows the user's picks.
const toStatuses = (values: string[]): ApplicationStatus[] =>
  values.flatMap((value) => {
    const parsed = applicationStatusSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });

export function StatusFilter({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold leading-normal tracking-[0.08em] text-muted-foreground uppercase">
        Estado
      </p>
      <ToggleGroup
        type="multiple"
        variant="outline"
        spacing={2}
        aria-label="Estado"
        className="flex-wrap"
        value={value}
        onValueChange={(next) => onChange(toStatuses(next))}
      >
        {applicationStatusSchema.options.map((status) => (
          <ToggleGroupItem
            key={status}
            value={status}
            className="h-11 px-2 text-sm font-semibold data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {STATUS_LABELS[status]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
