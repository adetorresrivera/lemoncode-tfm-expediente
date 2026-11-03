import { useId } from "react";
import { senioritySchema, workModeSchema } from "@tfm/contracts";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/common/components/ui/native-select";
import { Label } from "@/common/components/ui/label";
import { SENIORITY_LABELS, WORK_MODE_LABELS } from "@/common/lib/enum-labels";
import type { ListSearch } from "@/core/router/application-search";

interface Props {
  query: ListSearch;
  onQueryChange: (next: ListSearch) => void;
}

export function SelectFilters({ query, onQueryChange }: Props) {
  const workModeId = useId();
  const seniorityId = useId();
  const sortId = useId();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={workModeId}>Modalidad</Label>
        <NativeSelect
          id={workModeId}
          value={query.workMode ?? ""}
          onChange={(event) =>
            // The empty "all" option fails the parse, which yields undefined.
            onQueryChange({
              ...query,
              workMode: workModeSchema.safeParse(event.target.value).data,
            })
          }
        >
          <NativeSelectOption value="">Todas</NativeSelectOption>
          {workModeSchema.options.map((mode) => (
            <NativeSelectOption key={mode} value={mode}>
              {WORK_MODE_LABELS[mode]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={seniorityId}>Seniority</Label>
        <NativeSelect
          id={seniorityId}
          value={query.seniority ?? ""}
          onChange={(event) =>
            onQueryChange({
              ...query,
              seniority: senioritySchema.safeParse(event.target.value).data,
            })
          }
        >
          <NativeSelectOption value="">Todos</NativeSelectOption>
          {senioritySchema.options.map((level) => (
            <NativeSelectOption key={level} value={level}>
              {SENIORITY_LABELS[level]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={sortId}>Ordenar por</Label>
        <NativeSelect
          id={sortId}
          value={query.sort}
          onChange={(event) =>
            onQueryChange({
              ...query,
              sort:
                event.target.value === "appliedAt" ? "appliedAt" : "updatedAt",
            })
          }
        >
          <NativeSelectOption value="updatedAt">
            Última actualización
          </NativeSelectOption>
          <NativeSelectOption value="appliedAt">
            Fecha de envío
          </NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
  );
}
