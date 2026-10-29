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
      value={preference}
      onValueChange={handleValueChange}
    >
      <ToggleGroupItem value="system" className="gap-1.5">
        <Monitor strokeWidth={1.5} className="size-4" aria-hidden="true" />
        Sistema
      </ToggleGroupItem>
      <ToggleGroupItem value="light" className="gap-1.5">
        <Sun strokeWidth={1.5} className="size-4" aria-hidden="true" />
        Claro
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" className="gap-1.5">
        <Moon strokeWidth={1.5} className="size-4" aria-hidden="true" />
        Oscuro
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
