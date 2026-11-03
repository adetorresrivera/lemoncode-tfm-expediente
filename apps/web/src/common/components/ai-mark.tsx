interface Props {
  id: string;
}

// The «IA» badge next to a field label. The visible text is hidden from assistive tech; the
// sr-only reading is what the control announces through `aria-describedby` pointing at `id`.
export function AiMark({ id }: Props) {
  return (
    <span
      id={id}
      className="inline-flex h-5 items-center rounded-sm bg-brand-navy px-1.5 text-[11px] font-bold tracking-wide text-brand-parchment"
    >
      <span aria-hidden="true">IA</span>
      <span className="sr-only">Rellenado por la IA</span>
    </span>
  );
}
