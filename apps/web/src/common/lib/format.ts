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

/** «52.000 € – 65.000 €», «Desde 52.000 €», «Hasta 65.000 €» or null when both bounds are null. */
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

export function formatMoney(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    useGrouping: "always",
  }).format(amount);
}
