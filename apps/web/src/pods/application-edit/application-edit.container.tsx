import { createApplication, updateApplication } from "./api/api";
import { ApplicationEditComponent } from "./application-edit.component";
import {
  useApplicationEditLoad,
  useApplicationForm,
  useOfferExtraction,
} from "./application-edit.hooks";
import { keepStoredAppliedAt } from "./application-edit.mapper";
import {
  EMPTY_FORM_VALUES,
  type ApplicationEditSummary,
  type ApplicationFormValues,
  type RenderCancelLink,
  type RenderListLink,
} from "./application-edit.vm";
import {
  EditLoadError,
  EditNotFound,
  EditSkeleton,
} from "./components/edit-states";

interface Props {
  // Create mode when undefined.
  applicationId?: string;
  onSaved: (id: string) => void;
  renderCancelLink: RenderCancelLink;
  renderListLink: RenderListLink;
}

interface CreateProps {
  onSaved: (id: string) => void;
  renderCancelLink: RenderCancelLink;
}

function ApplicationCreate({ onSaved, renderCancelLink }: CreateProps) {
  const { form, formMessage } = useApplicationForm({
    initialValues: EMPTY_FORM_VALUES,
    save: createApplication,
    onSaved: (application) => onSaved(application.id),
  });
  const { draft, setDraft, status, analyze } = useOfferExtraction({
    form,
    initialDraft: "",
  });

  return (
    <ApplicationEditComponent
      mode="create"
      form={form}
      formMessage={formMessage}
      offerPanel={{
        defaultOpen: true,
        draft,
        status,
        onDraftChange: setDraft,
        onAnalyze: analyze,
      }}
      renderCancelLink={renderCancelLink}
    />
  );
}

interface EditFormProps extends CreateProps {
  applicationId: string;
  values: ApplicationFormValues;
  summary: ApplicationEditSummary;
}

// Rendered only once the application has loaded, and keyed by the id: the form never starts from
// partial data. The save sends the stored appliedAt instant back unless the date was edited.
function ApplicationEditForm({
  applicationId,
  values,
  summary,
  onSaved,
  renderCancelLink,
}: EditFormProps) {
  const { form, formMessage } = useApplicationForm({
    initialValues: values,
    save: (input) =>
      updateApplication(
        applicationId,
        keepStoredAppliedAt(input, summary.appliedAt),
      ),
    onSaved: (application) => onSaved(application.id),
  });
  const { draft, setDraft, status, analyze } = useOfferExtraction({
    form,
    initialDraft: "",
  });

  return (
    <ApplicationEditComponent
      mode="edit"
      summary={summary}
      form={form}
      formMessage={formMessage}
      offerPanel={{
        defaultOpen: false,
        draft,
        status,
        onDraftChange: setDraft,
        onAnalyze: analyze,
      }}
      renderCancelLink={renderCancelLink}
    />
  );
}

function ApplicationEditLoader({
  applicationId,
  onSaved,
  renderCancelLink,
  renderListLink,
}: Props & { applicationId: string }) {
  const { status, values, summary, errorCode, retry } =
    useApplicationEditLoad(applicationId);

  if (status === "loading") return <EditSkeleton />;
  if (status === "notFound") {
    return <EditNotFound renderListLink={renderListLink} />;
  }
  if (status === "error" || values === null || summary === null) {
    return (
      <EditLoadError code={errorCode ?? "INTERNAL_ERROR"} onRetry={retry} />
    );
  }
  return (
    <ApplicationEditForm
      key={applicationId}
      applicationId={applicationId}
      values={values}
      summary={summary}
      onSaved={onSaved}
      renderCancelLink={renderCancelLink}
    />
  );
}

export function ApplicationEditContainer({
  applicationId,
  onSaved,
  renderCancelLink,
  renderListLink,
}: Props) {
  if (applicationId === undefined) {
    return (
      <ApplicationCreate
        onSaved={onSaved}
        renderCancelLink={renderCancelLink}
      />
    );
  }
  return (
    <ApplicationEditLoader
      key={applicationId}
      applicationId={applicationId}
      onSaved={onSaved}
      renderCancelLink={renderCancelLink}
      renderListLink={renderListLink}
    />
  );
}
