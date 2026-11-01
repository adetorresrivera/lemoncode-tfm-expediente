import { createApplication, updateApplication } from "./api/api";
import { ApplicationEditComponent } from "./application-edit.component";
import {
  useAiMarks,
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
  const marks = useAiMarks();
  // `clearStatus` comes from the extraction hook, which needs the form: the callback only runs
  // after a save, when both exist. Marks and summary clear on a successful save only (D-17).
  const { form, formMessage } = useApplicationForm({
    initialValues: EMPTY_FORM_VALUES,
    save: createApplication,
    onUserChange: marks.onUserChange,
    onSaved: (application) => {
      marks.clear();
      clearStatus();
      onSaved(application.id);
    },
  });
  const { draft, setDraft, status, analyze, cancel, clearStatus } =
    useOfferExtraction({
      form,
      initialDraft: "",
      onMerged: marks.addFromMerge,
    });

  return (
    <ApplicationEditComponent
      mode="create"
      form={form}
      marks={marks.marks}
      formMessage={formMessage}
      offerPanel={{
        defaultOpen: true,
        draft,
        status,
        onDraftChange: setDraft,
        onAnalyze: analyze,
        onCancel: cancel,
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
  const marks = useAiMarks();
  const { form, formMessage } = useApplicationForm({
    initialValues: values,
    save: (input) =>
      updateApplication(
        applicationId,
        keepStoredAppliedAt(input, summary.appliedAt),
      ),
    onUserChange: marks.onUserChange,
    onSaved: (application) => {
      marks.clear();
      clearStatus();
      onSaved(application.id);
    },
  });
  const { draft, setDraft, status, analyze, cancel, clearStatus } =
    useOfferExtraction({
      form,
      initialDraft: values.offerText,
      onMerged: marks.addFromMerge,
    });

  return (
    <ApplicationEditComponent
      mode="edit"
      summary={summary}
      form={form}
      marks={marks.marks}
      formMessage={formMessage}
      offerPanel={{
        defaultOpen: false,
        draft,
        status,
        onDraftChange: setDraft,
        onAnalyze: analyze,
        onCancel: cancel,
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
