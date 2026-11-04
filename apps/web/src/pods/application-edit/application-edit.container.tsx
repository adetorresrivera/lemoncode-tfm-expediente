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
  type RenderDocumentPicker,
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
  renderDocumentPicker: RenderDocumentPicker;
}

interface CreateProps {
  onSaved: (id: string) => void;
  renderCancelLink: RenderCancelLink;
  renderDocumentPicker: RenderDocumentPicker;
}

function ApplicationCreate({
  onSaved,
  renderCancelLink,
  renderDocumentPicker,
}: CreateProps) {
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
  const {
    draft,
    setDraft,
    open,
    setOpen,
    status,
    analyze,
    cancel,
    clearStatus,
  } = useOfferExtraction({
    form,
    initialDraft: "",
    initialOpen: true,
    getMarks: marks.getMarks,
    onMerged: marks.setFromMerge,
  });

  return (
    <ApplicationEditComponent
      mode="create"
      form={form}
      marks={marks.marks}
      formMessage={formMessage}
      offerPanel={{
        open,
        onOpenChange: setOpen,
        draft,
        status,
        onDraftChange: setDraft,
        onAnalyze: analyze,
        onCancel: cancel,
      }}
      renderCancelLink={renderCancelLink}
      renderDocumentPicker={renderDocumentPicker}
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
  renderDocumentPicker,
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
  const {
    draft,
    setDraft,
    open,
    setOpen,
    status,
    analyze,
    cancel,
    clearStatus,
  } = useOfferExtraction({
    form,
    initialDraft: values.offerText,
    initialOpen: false,
    getMarks: marks.getMarks,
    onMerged: marks.setFromMerge,
  });

  return (
    <ApplicationEditComponent
      mode="edit"
      summary={summary}
      form={form}
      marks={marks.marks}
      formMessage={formMessage}
      offerPanel={{
        open,
        onOpenChange: setOpen,
        draft,
        status,
        onDraftChange: setDraft,
        onAnalyze: analyze,
        onCancel: cancel,
      }}
      renderCancelLink={renderCancelLink}
      renderDocumentPicker={renderDocumentPicker}
    />
  );
}

function ApplicationEditLoader({
  applicationId,
  onSaved,
  renderCancelLink,
  renderListLink,
  renderDocumentPicker,
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
      renderDocumentPicker={renderDocumentPicker}
    />
  );
}

export function ApplicationEditContainer({
  applicationId,
  onSaved,
  renderCancelLink,
  renderListLink,
  renderDocumentPicker,
}: Props) {
  if (applicationId === undefined) {
    return (
      <ApplicationCreate
        onSaved={onSaved}
        renderCancelLink={renderCancelLink}
        renderDocumentPicker={renderDocumentPicker}
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
      renderDocumentPicker={renderDocumentPicker}
    />
  );
}
