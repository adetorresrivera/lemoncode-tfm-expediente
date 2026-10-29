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

export function formatMoney(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    useGrouping: "always",
  }).format(amount);
}
