import { useId } from "react";
import type { ApplicationFormApi } from "../application-edit.hooks";
import { firstFieldError } from "./field-props";
import { TagGroupInput } from "./tag-group-input";

interface Props {
  form: ApplicationFormApi;
  // Keys (tagKey) of the chips the AI proposed and the user has not removed (D-14, D-15).
  aiTags?: ReadonlySet<string>;
}

export function TagsSection({ form, aiTags }: Props) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6"
    >
      <form.Field name="tags">
        {(field) => {
          const tags = field.state.value;
          const error = firstFieldError(field.state.meta.errors);
          return (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <h2
                  id={headingId}
                  className="font-serif text-base font-semibold leading-[1.2]"
                >
                  Etiquetas
                </h2>
                <p
                  aria-live="polite"
                  className="text-sm font-semibold text-muted-foreground"
                >
                  {tags.length} de 20
                </p>
              </div>
              <TagGroupInput
                group="stack"
                legend="Stack tecnológico"
                tags={tags}
                aiTags={aiTags}
                onChange={field.handleChange}
              />
              <TagGroupInput
                group="nice_to_have"
                legend="Se valora"
                soft
                tags={tags}
                aiTags={aiTags}
                onChange={field.handleChange}
              />
              <TagGroupInput
                group="language"
                legend="Idiomas"
                tags={tags}
                aiTags={aiTags}
                onChange={field.handleChange}
              />
              {error !== undefined ? (
                <p role="alert" className="text-sm text-foreground">
                  {error}
                </p>
              ) : null}
            </>
          );
        }}
      </form.Field>
    </section>
  );
}
