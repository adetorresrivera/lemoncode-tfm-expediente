import { MAX_TAGS, normalizeTags, type TagGroup } from "@tfm/contracts";
import { useEffect, useId, useRef, useState } from "react";
import { TagChip } from "@/common/components/tag-chip";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import type { ApplicationFormTag } from "../application-edit.vm";

interface Props {
  group: TagGroup;
  legend: string;
  soft?: boolean;
  // The full tag list of the form (every group); `onChange` receives the full normalized list.
  tags: ApplicationFormTag[];
  onChange: (next: ApplicationFormTag[]) => void;
}

// Where focus goes after a removal: the remove button of a chip (by label) or the group input.
type PendingFocus = { kind: "chip"; label: string } | { kind: "input" };

export function TagGroupInput({ group, legend, soft, tags, onChange }: Props) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const pendingFocus = useRef<PendingFocus | null>(null);

  const groupTags = tags.filter((tag) => tag.group === group);

  // Runs after the list re-rendered without the removed chip.
  useEffect(() => {
    const pending = pendingFocus.current;
    if (pending === null) return;
    pendingFocus.current = null;
    if (pending.kind === "input") {
      inputRef.current?.focus();
      return;
    }
    const target = Array.from(
      listRef.current?.querySelectorAll("button") ?? [],
    ).find(
      (button) =>
        button.getAttribute("aria-label") === `Quitar ${pending.label}`,
    );
    (target ?? inputRef.current)?.focus();
  }, [tags]);

  const add = () => {
    if (draft.trim() === "") return;
    const next = normalizeTags([...tags, { label: draft, group }]);
    if (next.length > tags.length) {
      const added = next[next.length - 1];
      onChange(next);
      setDraft("");
      setFeedback(`${added?.label ?? draft.trim()} añadida.`);
      inputRef.current?.focus();
      return;
    }
    setFeedback(
      tags.length >= MAX_TAGS ? "Máximo 20 etiquetas" : "Ya está en la lista",
    );
  };

  const remove = (index: number) => {
    const removed = groupTags[index];
    if (removed === undefined) return;
    const neighbour = groupTags[index + 1] ?? groupTags[index - 1];
    pendingFocus.current =
      neighbour === undefined
        ? { kind: "input" }
        : { kind: "chip", label: neighbour.label };
    onChange(tags.filter((tag) => tag !== removed));
    setFeedback(`${removed.label} quitada.`);
  };

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        {legend}
      </legend>
      <div className="flex gap-2">
        <Label htmlFor={inputId} className="sr-only">
          Añadir etiqueta a {legend}
        </Label>
        <Input
          id={inputId}
          ref={inputRef}
          value={draft}
          maxLength={40}
          placeholder="Ej.: React"
          autoComplete="off"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            // Enter adds the tag; it must never submit the form.
            event.preventDefault();
            add();
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0"
          onClick={add}
        >
          Añadir
        </Button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-sm text-muted-foreground"
      >
        {feedback}
      </p>
      <ul ref={listRef} className="flex flex-wrap gap-2">
        {groupTags.map((tag, index) => (
          <li key={tag.label} className="max-w-full min-w-0">
            <TagChip
              label={tag.label}
              soft={soft}
              onRemove={() => remove(index)}
            />
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
