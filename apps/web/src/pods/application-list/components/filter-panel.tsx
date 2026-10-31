import { RotateCcw } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import {
  hasActiveFilters,
  isDefaultSort,
  type ListSearch,
} from "@/core/router/application-search";
import { SearchField } from "./search-field";

interface Props {
  query: ListSearch;
  onQueryChange: (next: ListSearch) => void;
  onClear: () => void;
  clearCount: number;
}

export function FilterPanel({
  query,
  onQueryChange,
  onClear,
  clearCount,
}: Props) {
  const canClear = hasActiveFilters(query) || !isDefaultSort(query);

  return (
    <div
      role="search"
      aria-label="Filtrar candidaturas"
      className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6"
    >
      {/* Remounted on «Limpiar filtros»: after a clear the field starts empty even if the URL
          has not caught up yet, and it takes focus because the button disappears. */}
      <SearchField
        key={clearCount}
        initialValue={clearCount === 0 ? (query.q ?? "") : ""}
        focusOnMount={clearCount > 0}
        onSearch={(q) => onQueryChange({ ...query, q })}
      />
      {canClear ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            onClick={onClear}
          >
            <RotateCcw aria-hidden="true" />
            Limpiar filtros
          </Button>
        </div>
      ) : null}
    </div>
  );
}
