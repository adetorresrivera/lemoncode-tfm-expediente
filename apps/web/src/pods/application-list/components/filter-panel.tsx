import { useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import {
  hasActiveFilters,
  isDefaultSort,
  type ListSearch,
} from "@/core/router/application-search";
import { SearchField } from "./search-field";
import { SelectFilters } from "./select-filters";
import { StatusFilter } from "./status-filter";
import { TagFilter } from "./tag-filter";
import type { StackTagsVm } from "../application-list.vm";

interface Props {
  query: ListSearch;
  onQueryChange: (next: ListSearch) => void;
  onClear: () => void;
  clearCount: number;
  stackTags: StackTagsVm;
  onRetryStackTags: () => void;
}

// Dimensions that live behind «Filtros y orden» below lg: one per active filter group, plus one
// for a sort other than the default. The text search is not counted (it is always visible).
const countActiveDimensions = (query: ListSearch): number =>
  [
    (query.status?.length ?? 0) > 0,
    (query.tags?.length ?? 0) > 0,
    query.workMode !== undefined,
    query.seniority !== undefined,
    !isDefaultSort(query),
  ].filter(Boolean).length;

export function FilterPanel({
  query,
  onQueryChange,
  onClear,
  clearCount,
  stackTags,
  onRetryStackTags,
}: Props) {
  const canClear = hasActiveFilters(query) || !isDefaultSort(query);
  const activeCount = countActiveDimensions(query);
  // Starts open when something is already applied, so a reloaded URL never hides its filters.
  const [open, setOpen] = useState(activeCount > 0);

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
      <Button
        type="button"
        variant="ghost"
        className="h-11 self-start lg:hidden"
        aria-expanded={open}
        aria-controls="filters-extra"
        onClick={() => setOpen((value) => !value)}
      >
        <SlidersHorizontal aria-hidden="true" />
        {activeCount > 0
          ? `Filtros y orden (${activeCount})`
          : "Filtros y orden"}
      </Button>
      <div
        id="filters-extra"
        className={
          open ? "flex flex-col gap-4" : "hidden flex-col gap-4 lg:flex"
        }
      >
        <StatusFilter
          value={query.status ?? []}
          onChange={(status) =>
            onQueryChange({
              ...query,
              status: status.length > 0 ? status : undefined,
            })
          }
        />
        <TagFilter
          status={stackTags.status}
          options={stackTags.options}
          selected={query.tags ?? []}
          onChange={(tags) =>
            onQueryChange({
              ...query,
              tags: tags.length > 0 ? tags : undefined,
            })
          }
          onRetry={onRetryStackTags}
        />
        <SelectFilters query={query} onQueryChange={onQueryChange} />
      </div>
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
