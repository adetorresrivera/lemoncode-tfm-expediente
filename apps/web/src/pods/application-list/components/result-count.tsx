interface Props {
  count: number | null;
}

const countText = (count: number | null): string => {
  if (count === null) return "";
  if (count === 0) return "Sin candidaturas";
  if (count === 1) return "1 candidatura";
  return `${count} candidaturas`;
};

export function ResultCount({ count }: Props) {
  return (
    <p aria-live="polite" className="text-sm text-muted-foreground">
      {countText(count)}
    </p>
  );
}
