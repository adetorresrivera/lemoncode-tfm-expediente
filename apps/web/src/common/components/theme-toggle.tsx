import { Monitor, Moon, Sun } from "lucide-react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/common/components/ui/toggle-group";
import {
  isThemePreference,
  setThemePreference,
  useThemePreference,
} from "@/core/theme/theme";

const ITEM_CLASS =
  "h-auto min-h-11 flex-1 flex-col gap-1 px-1 py-1 focus-visible:ring-sidebar-ring";

export function ThemeToggle() {
  const preference = useThemePreference();

  // Radix emits an empty string when the active item is clicked again.
  const handleValueChange = (value: string) => {
    if (isThemePreference(value)) setThemePreference(value);
  };

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Tema"
      className="w-full"
      value={preference}
      onValueChange={handleValueChange}
    >
      <ToggleGroupItem value="system" className={ITEM_CLASS}>
        <Monitor strokeWidth={1.5} className="size-4" aria-hidden="true" />
        Sistema
      </ToggleGroupItem>
      <ToggleGroupItem value="light" className={ITEM_CLASS}>
        <Sun strokeWidth={1.5} className="size-4" aria-hidden="true" />
        Claro
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" className={ITEM_CLASS}>
        <Moon strokeWidth={1.5} className="size-4" aria-hidden="true" />
        Oscuro
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
