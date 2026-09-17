import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell.jsx';
import TextField, { Select, TextArea } from '../../components/TextField.jsx';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { requestsApi, servicesApi } from '../../services/fixApi.js';
import { todayDateOnly } from '../../utils/format.js';

const MAX_ATTACHMENTS = 10;

const initialForm = {
  serviceId: '',
  description: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  preferredDate: '',
  preferredTime: '',
};

function lengthError(value, label, min, max) {
  const length = value.trim().length;

  if (length === 0) return `Enter ${label.toLowerCase()}.`;
  if (length < min) return `${label} must be at least ${min} characters.`;
  if (length > max) return `${label} must be ${max} characters or fewer.`;
  return '';
}

function validate(form, attachments, serviceIds) {
  const errors = {
    serviceId: !form.serviceId
      ? 'Choose a service.'
      : !serviceIds.includes(form.serviceId)
        ? 'This service is not available. Choose another one.'
        : '',
    description: lengthError(form.description, 'Problem description', 5, 2000),
    addressLine: lengthError(form.addressLine, 'Address', 5, 240),
    city: lengthError(form.city, 'City', 2, 80),
    state: lengthError(form.state, 'State', 2, 80),
    pincode: /^\d{6}$/.test(form.pincode.trim()) ? '' : 'Enter a valid 6-digit pincode.',
    preferredDate: !/^\d{4}-\d{2}-\d{2}$/.test(form.preferredDate)
      ? 'Choose a preferred date.'
      : form.preferredDate < todayDateOnly()
        ? 'Preferred date cannot be in the past.'
        : '',
    preferredTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(form.preferredTime)
      ? ''
      : 'Choose a preferred time.',
    attachments: attachments.length > MAX_ATTACHMENTS ? `Add at most ${MAX_ATTACHMENTS} attachments.` : '',
  };

  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

function ReportPage() {
  const preselectedServiceId = useQueryParam('serviceId') || '';
  const services = useApi(() => servicesApi.list(), []);
  const [form, setForm] = useState({ ...initialForm, serviceId: preselectedServiceId });
  const [attachments, setAttachments] = useState([]);
  const [attachmentDraft, setAttachmentDraft] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const [errors, setErrors] = useState({});
  const submit = useAction();

  useEffect(() => {
    if (preselectedServiceId) {
      setForm((current) => ({ ...current, serviceId: preselectedServiceId }));
    }
  }, [preselectedServiceId]);

  const serviceList = services.data?.services || [];
  const serviceIds = serviceList.map((service) => service.id);

  useEffect(() => {
    if (!services.data || !preselectedServiceId) {
      return;
    }

    if (!services.data.services.some((service) => service.id === preselectedServiceId)) {
      setForm((current) => ({ ...current, serviceId: '' }));
      setErrors((current) => ({
        ...current,
        serviceId: 'That service is no longer available. Choose another one.',
      }));
    }
  }, [services.data, preselectedServiceId]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    submit.setError('');
  }

  function addAttachment() {
    const value = attachmentDraft.trim();

    if (!value) {
      setAttachmentError('Enter a link or note to attach.');
      return;
    }

    if (value.length > 500) {
      setAttachmentError('Attachments must be 500 characters or fewer.');
      return;
    }

    if (attachments.length >= MAX_ATTACHMENTS) {
      setAttachmentError(`You can add up to ${MAX_ATTACHMENTS} attachments.`);
      return;
    }

    setAttachments((current) => [...current, value]);
    setAttachmentDraft('');
    setAttachmentError('');
  }

  function removeAttachment(index) {
    setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setAttachmentError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validate(form, attachments, serviceIds);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }

    await submit.run('create', async () => {
      const result = await requestsApi.create({
        serviceId: form.serviceId,
        description: form.description.trim(),
        attachments,
        address: {
          addressLine: form.addressLine.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
        },
        preferredDate: form.preferredDate,
        preferredTime: form.preferredTime,
      });

      navigate(`/requests/${result.request.id}?created=1`);
    });
  }

  if (services.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState label="Loading services…" />
      </AppShell>
    );
  }

  if (services.error) {
    return (
      <AppShell width="narrow">
        <PageHeader title="Report an issue" />
        <ErrorState error={services.error} onRetry={services.reload} />
      </AppShell>
    );
  }

  if (serviceList.length === 0) {
    return (
      <AppShell width="narrow">
        <PageHeader title="Report an issue" />
        <EmptyState
          title="No services available right now"
          message="You can report an issue as soon as services are available."
        />
      </AppShell>
    );
  }

  const isSubmitting = submit.pending === 'create';

  return (
    <AppShell width="narrow">
      <PageHeader
        title="Report an issue"
        subtitle="Tell us what needs fixing. Providers will review it and send you quotes."
      />

      <form className="stack" onSubmit={handleSubmit} noValidate>
        <Notice>{submit.error}</Notice>

        <Card>
          <h2 className="card__title">The problem</h2>
          <div className="form-stack">
            <Select
              id="serviceId"
              label="Service"
              placeholder="Choose a service"
              value={form.serviceId}
              error={errors.serviceId}
              options={serviceList.map((service) => ({ value: service.id, label: service.name }))}
              onChange={(event) => updateField('serviceId', event.target.value)}
            />
            <TextArea
              id="description"
              label="Problem description"
              rows={4}
              maxLength={2000}
              value={form.description}
              error={errors.description}
              placeholder="e.g. The AC is running but not cooling, and water drips from the indoor unit."
              onChange={(event) => updateField('description', event.target.value)}
            />

            <div className="field">
              <label htmlFor="attachmentDraft">Attachments (optional)</label>
              <div className="inline-input">
                <div
                  className={`field-control${attachmentError || errors.attachments ? ' field-control--error' : ''}`}
                >
                  <input
                    id="attachmentDraft"
                    className="field-input"
                    type="text"
                    value={attachmentDraft}
                    maxLength={500}
                    placeholder="Paste a photo link or add a note"
                    aria-describedby="attachment-hint"
                    disabled={attachments.length >= MAX_ATTACHMENTS}
                    onChange={(event) => {
                      setAttachmentDraft(event.target.value);
                      setAttachmentError('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addAttachment();
                      }
                    }}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={addAttachment}
                  disabled={attachments.length >= MAX_ATTACHMENTS}
                >
                  Add
                </Button>
              </div>
              {attachmentError || errors.attachments ? (
                <p className="field-error">{attachmentError || errors.attachments}</p>
              ) : (
                <p className="field-hint" id="attachment-hint">
                  {attachments.length}/{MAX_ATTACHMENTS} added. File upload is coming soon.
                </p>
              )}
              {attachments.length > 0 ? (
                <ul className="removable-list">
                  {attachments.map((attachment, index) => (
                    <li key={`${attachment}-${index}`}>
                      <span>{attachment}</span>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => removeAttachment(index)}
                        aria-label={`Remove attachment ${index + 1}`}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="card__title">Service address</h2>
          <div className="form-stack">
            <TextField
              id="addressLine"
              label="Address"
              autoComplete="street-address"
              maxLength={240}
              value={form.addressLine}
              error={errors.addressLine}
              placeholder="House / flat, street, area"
              onChange={(event) => updateField('addressLine', event.target.value)}
            />
            <div className="form-row">
              <TextField
                id="city"
                label="City"
                autoComplete="address-level2"
                maxLength={80}
                value={form.city}
                error={errors.city}
                placeholder="City"
                onChange={(event) => updateField('city', event.target.value)}
              />
              <TextField
                id="state"
                label="State"
                autoComplete="address-level1"
                maxLength={80}
                value={form.state}
                error={errors.state}
                placeholder="State"
                onChange={(event) => updateField('state', event.target.value)}
              />
            </div>
            <TextField
              id="pincode"
              label="Pincode"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              value={form.pincode}
              error={errors.pincode}
              placeholder="6-digit pincode"
              onChange={(event) => updateField('pincode', event.target.value.replace(/\D/g, ''))}
            />
          </div>
        </Card>

        <Card>
          <h2 className="card__title">Preferred time</h2>
          <div className="form-row">
            <TextField
              id="preferredDate"
              label="Date"
              type="date"
              min={todayDateOnly()}
              value={form.preferredDate}
              error={errors.preferredDate}
              onChange={(event) => updateField('preferredDate', event.target.value)}
            />
            <TextField
              id="preferredTime"
              label="Time"
              type="time"
              value={form.preferredTime}
              error={errors.preferredTime}
              onChange={(event) => updateField('preferredTime', event.target.value)}
            />
          </div>
        </Card>

        <div className="sticky-actions">
          <Button type="submit" block size="lg" loading={isSubmitting} loadingText="Sending request…">
            Submit request
          </Button>
        </div>
      </form>
    </AppShell>
  );
}

export default ReportPage;
