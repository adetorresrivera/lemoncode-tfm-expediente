export function formatDate(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(timeZone ? { timeZone } : {}),
  })
    .formatToParts(new Date(iso))
    .map((part) =>
      part.type === "month" && !part.value.endsWith(".")
        ? `${part.value}.`
        : part.value,
    )
    .join("");
}

/** «5 nov. 2026, 10:30»: es-ES, abbreviated month with its period, two-digit 24-hour time. */
export function formatDateTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...(timeZone ? { timeZone } : {}),
  })
    .formatToParts(new Date(iso))
    .map((part) =>
      part.type === "month" && !part.value.endsWith(".")
        ? `${part.value}.`
        : part.value,
    )
    .join("");
}

const pad = (value: number): string => String(value).padStart(2, "0");

/**
 * Turns the value of a `datetime-local` control («YYYY-MM-DDTHH:mm», read as local time) into ISO 8601
 * UTC, or null when it is empty or does not parse. A time that does not exist (spring-forward gap)
 * moves to the valid instant; one that happens twice (fall-back) takes its first occurrence.
 */
export function localInputToIso(value: string): string | null {
  if (value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** The `datetime-local` value of a stored instant in the browser zone, to the minute. */
export function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** «52.000 € – 65.000 €», «Desde 52.000 €»,«Hasta 65.000 €» or null when both bounds are null. */
export function formatSalaryRange(
  min: number | null,
  max: number | null,
  currency?: string | null,
): string | null {
  const code = currency ?? "EUR";
  if (min !== null && max !== null) {
    return min === max
      ? formatMoney(min, code)
      : `${formatMoney(min, code)} – ${formatMoney(max, code)}`;
  }
  if (min !== null) return `Desde ${formatMoney(min, code)}`;
  if (max !== null) return `Hasta ${formatMoney(max, code)}`;
  return null;
}

const sizeFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1,
});

/**
 * Readable file size, base 1024, es-ES numbers with at most one decimal («,0» omitted).
 * B under 1024 bytes; from there KB, unless the KB value rounded to one decimal reaches 1024,
 * which is shown in MB. No unit above MB (5 MB ceiling).
 *
 * 512 → «512 B», 1023 → «1023 B», 1024 → «1 KB», 1536 → «1,5 KB», 235520 → «230 KB»,
 * 1048575 → «1 MB», 1258291 → «1,2 MB», 5242880 → «5 MB».
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  const roundedKb = Math.round(kb * 10) / 10;
  if (roundedKb < 1024) return `${sizeFormatter.format(kb)} KB`;
  return `${sizeFormatter.format(bytes / 1048576)} MB`;
}

export function formatMoney(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    useGrouping: "always",
  }).format(amount);
}
