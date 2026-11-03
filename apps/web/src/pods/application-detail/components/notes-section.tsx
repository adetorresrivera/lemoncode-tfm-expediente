interface Props {
  notes: string | null;
}

// Notes are plain text: a text node with preserved line breaks, never HTML.
export function NotesSection({ notes }: Props) {
  return (
    <section
      aria-labelledby="notes-heading"
      className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6"
    >
      <h2
        id="notes-heading"
        className="font-serif text-base font-semibold leading-[1.2]"
      >
        Notas
      </h2>
      {notes ? (
        <p className="whitespace-pre-wrap break-words">{notes}</p>
      ) : (
        <p className="text-muted-foreground">Sin notas.</p>
      )}
    </section>
  );
}
