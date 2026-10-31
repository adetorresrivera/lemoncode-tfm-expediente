import { createApplication } from "./api/api";
import { ApplicationEditComponent } from "./application-edit.component";
import { useApplicationForm } from "./application-edit.hooks";
import {
  EMPTY_FORM_VALUES,
  type RenderCancelLink,
} from "./application-edit.vm";

interface Props {
  // Create mode when undefined; plan 02-12 adds the edit mode on this same prop.
  applicationId?: string;
  onSaved: (id: string) => void;
  renderCancelLink: RenderCancelLink;
}

export function ApplicationEditContainer({ onSaved, renderCancelLink }: Props) {
  const { form, formMessage } = useApplicationForm({
    initialValues: EMPTY_FORM_VALUES,
    save: createApplication,
    onSaved: (application) => onSaved(application.id),
  });

  return (
    <ApplicationEditComponent
      form={form}
      formMessage={formMessage}
      renderCancelLink={renderCancelLink}
    />
  );
}
