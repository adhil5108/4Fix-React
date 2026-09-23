import { useState } from 'react';
import { AddressForm, validateAddress } from '../../components/AddressForm.jsx';
import AppShell from '../../components/AppShell.jsx';
import ImageAttachments from '../../components/ImageAttachments.jsx';
import TextField, { TextArea } from '../../components/TextField.jsx';
import { Button, Card, ErrorState, LoadingState, Notice, PageHeader } from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { navigate } from '../../hooks/useRoute.js';
import { providerExternalJobsApi } from '../../services/fixApi.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function emptyForm() {
  return {
    customerName: '',
    customerPhone: '',
    serviceLabel: '',
    description: '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
    scheduledDate: '',
    scheduledTime: '',
  };
}

function formFromJob(job) {
  return {
    customerName: job.customer?.name || '',
    customerPhone: job.customer?.phone || '',
    serviceLabel: job.serviceLabel || '',
    description: job.description || '',
    addressLine: job.address?.addressLine || '',
    city: job.address?.city || '',
    state: job.address?.state || '',
    pincode: job.address?.pincode || '',
    scheduledDate: job.scheduledDate || '',
    scheduledTime: job.scheduledTime || '',
  };
}

// Scheduled date/time are optional and never restricted to the future here — unlike a
// customer's preferred slot, a provider may be logging work that already happened.
function validate(form) {
  const errors = { ...validateAddress(form) };

  if (!form.customerName.trim()) errors.customerName = 'Enter the customer’s name.';
  if (!form.serviceLabel.trim()) errors.serviceLabel = 'Enter the service or job type.';

  const descriptionLength = form.description.trim().length;
  if (descriptionLength === 0) errors.description = 'Describe the job.';
  else if (descriptionLength > 2000) errors.description = 'Description must be 2000 characters or fewer.';

  if (form.scheduledDate && !DATE_PATTERN.test(form.scheduledDate)) {
    errors.scheduledDate = 'Enter a valid date.';
  }
  if (form.scheduledTime && !TIME_PATTERN.test(form.scheduledTime)) {
    errors.scheduledTime = 'Enter a valid time.';
  }

  return errors;
}

function ExternalJobForm({ jobId, initialJob }) {
  const isEdit = Boolean(jobId);
  const [form, setForm] = useState(() => (initialJob ? formFromJob(initialJob) : emptyForm()));
  const [attachments, setAttachments] = useState(initialJob?.attachments || []);
  const [initialNote, setInitialNote] = useState('');
  const [errors, setErrors] = useState({});
  const submit = useAction();

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    submit.setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }

    const payload = {
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim() || undefined,
      serviceLabel: form.serviceLabel.trim(),
      description: form.description.trim(),
      attachments,
      address: {
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
      },
      scheduledDate: form.scheduledDate || undefined,
      scheduledTime: form.scheduledTime || undefined,
    };

    await submit.run('save', async () => {
      const result = isEdit
        ? await providerExternalJobsApi.update(jobId, payload)
        : await providerExternalJobsApi.create(payload);

      if (!isEdit && initialNote.trim()) {
        try {
          await providerExternalJobsApi.notes.create(result.job.id, initialNote.trim());
        } catch {
          // The job itself saved; a failed initial note isn't worth blocking on — the
          // provider can add it from the job page instead.
        }
      }

      navigate(`/provider/jobs/external/${result.job.id}`);
    });
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <Notice>{submit.error}</Notice>

      <Card>
        <h2 className="card__title">Customer</h2>
        <div className="form-stack">
          <TextField
            id="customerName"
            label="Customer name"
            maxLength={120}
            value={form.customerName}
            error={errors.customerName}
            placeholder="Who is this job for?"
            onChange={(event) => updateField('customerName', event.target.value)}
          />
          <TextField
            id="customerPhone"
            label="Customer phone (optional)"
            type="tel"
            maxLength={20}
            value={form.customerPhone}
            error={errors.customerPhone}
            placeholder="Optional"
            onChange={(event) => updateField('customerPhone', event.target.value)}
          />
        </div>
      </Card>

      <Card>
        <h2 className="card__title">The job</h2>
        <div className="form-stack">
          <TextField
            id="serviceLabel"
            label="Service / job type"
            maxLength={120}
            value={form.serviceLabel}
            error={errors.serviceLabel}
            placeholder="e.g. AC gas refill"
            onChange={(event) => updateField('serviceLabel', event.target.value)}
          />
          <TextArea
            id="description"
            label="Description / issue"
            rows={4}
            maxLength={2000}
            value={form.description}
            error={errors.description}
            placeholder="What was the job? What did the customer report?"
            onChange={(event) => updateField('description', event.target.value)}
          />
          <ImageAttachments attachments={attachments} setAttachments={setAttachments} />
        </div>
      </Card>

      <Card>
        <h2 className="card__title">Location</h2>
        <AddressForm form={form} errors={errors} onChange={updateField} />
      </Card>

      <Card>
        <h2 className="card__title">Scheduled visit (optional)</h2>
        <p className="field-hint">
          Leave blank if it isn’t scheduled yet, or use a past date if you’re logging work already done.
        </p>
        <div className="form-row">
          <TextField
            id="scheduledDate"
            label="Date"
            type="date"
            value={form.scheduledDate}
            error={errors.scheduledDate}
            onChange={(event) => updateField('scheduledDate', event.target.value)}
          />
          <TextField
            id="scheduledTime"
            label="Time"
            type="time"
            value={form.scheduledTime}
            error={errors.scheduledTime}
            onChange={(event) => updateField('scheduledTime', event.target.value)}
          />
        </div>
      </Card>

      {!isEdit ? (
        <Card>
          <h2 className="card__title">Private notes (optional)</h2>
          <p className="field-hint">Only visible to you. You can add more later from the job page.</p>
          <TextArea
            id="initialNote"
            label="Note"
            rows={3}
            maxLength={2000}
            value={initialNote}
            placeholder="Materials used, follow-up needed, anything for your own records…"
            onChange={(event) => setInitialNote(event.target.value)}
          />
        </Card>
      ) : null}

      <div className="sticky-actions">
        <Button type="submit" block size="lg" loading={submit.pending === 'save'} loadingText="Saving…">
          {isEdit ? 'Save changes' : 'Add job'}
        </Button>
      </div>
    </form>
  );
}

function ExternalJobFormPage({ jobId }) {
  const isEdit = Boolean(jobId);
  const data = useApi(() => (isEdit ? providerExternalJobsApi.get(jobId) : Promise.resolve(null)), [jobId]);
  const back = isEdit
    ? { to: `/provider/jobs/external/${jobId}`, label: 'Job details' }
    : { to: '/provider/jobs', label: 'My jobs' };

  if (isEdit && data.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState label="Loading job…" />
      </AppShell>
    );
  }

  if (isEdit && data.error) {
    return (
      <AppShell width="narrow">
        <PageHeader title="Job" back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AppShell>
    );
  }

  return (
    <AppShell width="narrow">
      <PageHeader
        back={back}
        title={isEdit ? 'Edit job' : 'Add a job'}
        subtitle={isEdit ? undefined : 'Record a job that came in outside 4Fix.'}
      />
      <ExternalJobForm jobId={jobId} initialJob={isEdit ? data.data.job : null} />
    </AppShell>
  );
}

export default ExternalJobFormPage;
