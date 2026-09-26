import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddressForm, validateAddress } from '../../components/AddressForm.jsx';
import AppShell from '../../components/AppShell.jsx';
import ImageAttachments from '../../components/ImageAttachments.jsx';
import TextField, { TextArea } from '../../components/TextField.jsx';
import { Button, Card, ErrorState, LoadingState, Notice, PageHeader } from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { useTranslatedErrors } from '../../hooks/useTranslatedErrors.js';
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
function validate(form, t) {
  const errors = { ...validateAddress(form, t) };

  if (!form.customerName.trim()) errors.customerName = t('provider.externalForm.errors.customerName');
  if (!form.serviceLabel.trim()) errors.serviceLabel = t('provider.externalForm.errors.serviceLabel');

  const descriptionLength = form.description.trim().length;
  if (descriptionLength === 0) errors.description = t('provider.externalForm.errors.descriptionRequired');
  else if (descriptionLength > 2000) errors.description = t('provider.externalForm.errors.descriptionTooLong');

  if (form.scheduledDate && !DATE_PATTERN.test(form.scheduledDate)) {
    errors.scheduledDate = t('provider.externalForm.errors.date');
  }
  if (form.scheduledTime && !TIME_PATTERN.test(form.scheduledTime)) {
    errors.scheduledTime = t('provider.externalForm.errors.time');
  }

  return errors;
}

function ExternalJobForm({ jobId, initialJob }) {
  const { t } = useTranslation();
  const isEdit = Boolean(jobId);
  const [form, setForm] = useState(() => (initialJob ? formFromJob(initialJob) : emptyForm()));
  const [attachments, setAttachments] = useState(initialJob?.attachments || []);
  const [initialNote, setInitialNote] = useState('');
  const [errors, setErrors] = useState({});
  useTranslatedErrors(setErrors, () => validate(form, t));
  const submit = useAction();

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    submit.setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form, t);

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
        <h2 className="card__title">{t('provider.externalForm.customerTitle')}</h2>
        <div className="form-stack">
          <TextField
            id="customerName"
            label={t('provider.externalForm.customerName')}
            maxLength={120}
            value={form.customerName}
            error={errors.customerName}
            placeholder={t('provider.externalForm.customerNamePlaceholder')}
            onChange={(event) => updateField('customerName', event.target.value)}
          />
          <TextField
            id="customerPhone"
            label={t('provider.externalForm.customerPhone')}
            type="tel"
            maxLength={20}
            value={form.customerPhone}
            error={errors.customerPhone}
            placeholder={t('provider.externalForm.optional')}
            onChange={(event) => updateField('customerPhone', event.target.value)}
          />
        </div>
      </Card>

      <Card>
        <h2 className="card__title">{t('provider.externalForm.jobTitle')}</h2>
        <div className="form-stack">
          <TextField
            id="serviceLabel"
            label={t('provider.shared.serviceType')}
            maxLength={120}
            value={form.serviceLabel}
            error={errors.serviceLabel}
            placeholder={t('provider.externalForm.serviceLabelPlaceholder')}
            onChange={(event) => updateField('serviceLabel', event.target.value)}
          />
          <TextArea
            id="description"
            label={t('provider.externalForm.description')}
            rows={4}
            maxLength={2000}
            value={form.description}
            error={errors.description}
            placeholder={t('provider.externalForm.descriptionPlaceholder')}
            onChange={(event) => updateField('description', event.target.value)}
          />
          <ImageAttachments attachments={attachments} setAttachments={setAttachments} />
        </div>
      </Card>

      <Card>
        <h2 className="card__title">{t('provider.externalForm.locationTitle')}</h2>
        <AddressForm form={form} errors={errors} onChange={updateField} />
      </Card>

      <Card>
        <h2 className="card__title">{t('provider.externalForm.scheduleTitle')}</h2>
        <p className="field-hint">{t('provider.externalForm.scheduleHint')}</p>
        <div className="form-row">
          <TextField
            id="scheduledDate"
            label={t('provider.externalForm.date')}
            type="date"
            value={form.scheduledDate}
            error={errors.scheduledDate}
            onChange={(event) => updateField('scheduledDate', event.target.value)}
          />
          <TextField
            id="scheduledTime"
            label={t('provider.externalForm.time')}
            type="time"
            value={form.scheduledTime}
            error={errors.scheduledTime}
            onChange={(event) => updateField('scheduledTime', event.target.value)}
          />
        </div>
      </Card>

      {!isEdit ? (
        <Card>
          <h2 className="card__title">{t('provider.externalForm.notesTitle')}</h2>
          <p className="field-hint">{t('provider.externalForm.notesHint')}</p>
          <TextArea
            id="initialNote"
            label={t('provider.externalForm.noteLabel')}
            rows={3}
            maxLength={2000}
            value={initialNote}
            placeholder={t('provider.externalForm.notePlaceholder')}
            onChange={(event) => setInitialNote(event.target.value)}
          />
        </Card>
      ) : null}

      <div className="sticky-actions">
        <Button type="submit" block size="lg" loading={submit.pending === 'save'} loadingText={t('provider.externalForm.saving')}>
          {isEdit ? t('provider.externalForm.save') : t('provider.externalForm.add')}
        </Button>
      </div>
    </form>
  );
}

function ExternalJobFormPage({ jobId }) {
  const { t } = useTranslation();
  const isEdit = Boolean(jobId);
  const data = useApi(() => (isEdit ? providerExternalJobsApi.get(jobId) : Promise.resolve(null)), [jobId]);
  const back = isEdit
    ? { to: `/provider/jobs/external/${jobId}`, label: t('provider.externalForm.backToJob') }
    : { to: '/provider/jobs', label: t('provider.shared.myJobs') };

  if (isEdit && data.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState label={t('provider.shared.loadingJob')} />
      </AppShell>
    );
  }

  if (isEdit && data.error) {
    return (
      <AppShell width="narrow">
        <PageHeader title={t('provider.shared.job')} back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AppShell>
    );
  }

  return (
    <AppShell width="narrow">
      <PageHeader
        back={back}
        title={isEdit ? t('provider.externalForm.editTitle') : t('provider.externalForm.addTitle')}
        subtitle={isEdit ? undefined : t('provider.externalForm.subtitle')}
      />
      <ExternalJobForm jobId={jobId} initialJob={isEdit ? data.data.job : null} />
    </AppShell>
  );
}

export default ExternalJobFormPage;
