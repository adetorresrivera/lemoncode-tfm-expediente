import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { useDebouncedCallback } from "@/common/hooks/use-debounced-callback";

const DEBOUNCE_MS = 300;

interface Props {
  initialValue: string;
  onSearch: (text: string | undefined) => void;
  focusOnMount: boolean;
}

// The field owns its text. The URL is updated through the debounced callback; the text is never
// synced back from the URL (that would eat characters typed while the debounce is pending), and
// the parent remounts the field with a new key to reset it.
export function SearchField({ initialValue, onSearch, focusOnMount }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initialValue);
  const debouncedSearch = useDebouncedCallback(onSearch, DEBOUNCE_MS);

  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Buscar</Label>
      <Input
        ref={inputRef}
        id={id}
        type="search"
        maxLength={100}
        autoComplete="off"
        placeholder="Puesto o empresa"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          debouncedSearch(event.target.value.trim() || undefined);
        }}
      />
    </div>
  );
}
