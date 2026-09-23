import { useState } from 'react';
import { AddressForm, DateTimePicker, validateAddress, validateDateTime } from '../../components/AddressForm.jsx';
import AppShell from '../../components/AppShell.jsx';
import ImageAttachments, { MAX_ATTACHMENTS } from '../../components/ImageAttachments.jsx';
import StepIndicator from '../../components/StepIndicator.jsx';
import { TextArea } from '../../components/TextField.jsx';
import VoiceRecorder from '../../components/VoiceRecorder.jsx';
import { IssueCard } from '../../components/cards.jsx';
import {
  Button,
  Card,
  ErrorState,
  Link,
  LoadingState,
  Notice,
  PageHeader,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { requestsApi, servicesApi } from '../../services/fixApi.js';
import { bookPath } from '../public/publicLinks.js';

const initialForm = {
  description: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  preferredDate: '',
  preferredTime: '',
};

function validate(form, attachments) {
  const length = form.description.trim().length;
  const errors = {
    ...validateAddress(form),
    ...validateDateTime(form.preferredDate, form.preferredTime),
  };

  if (length === 0) errors.description = 'Describe the problem.';
  else if (length < 5) errors.description = 'Add a few more words (at least 5 characters).';
  else if (length > 2000) errors.description = 'Description must be 2000 characters or fewer.';

  if (attachments.length > MAX_ATTACHMENTS) {
    errors.attachments = `Add at most ${MAX_ATTACHMENTS} attachments.`;
  }

  return errors;
}

function BookPage({ serviceId }) {
  const issueKey = (useQueryParam('issue') || '').toUpperCase();
  const service = useApi(() => servicesApi.get(serviceId), [serviceId]);
  const [form, setForm] = useState(initialForm);
  const [attachments, setAttachments] = useState([]);
  const [voiceNote, setVoiceNote] = useState(null);
  const [errors, setErrors] = useState({});
  const submit = useAction();

  if (service.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState label="Loading service…" />
      </AppShell>
    );
  }

  if (service.error) {
    return (
      <AppShell width="narrow">
        <PageHeader title="Book a service" back={{ to: '/services', label: 'All services' }} />
        <ErrorState
          error={
            [400, 404].includes(service.error.status)
              ? { status: 404, message: 'This service is no longer available. Choose another one.' }
              : service.error
          }
          onRetry={service.reload}
        />
      </AppShell>
    );
  }

  const details = service.data.service;
  const issue = details.issues.find((item) => item.key === issueKey) || null;
  const step = issue ? 'details' : 'issue';

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    submit.setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form, attachments);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }

    await submit.run('create', async () => {
      const result = await requestsApi.create({
        serviceId,
        issueKey: issue.key,
        description: form.description.trim(),
        attachments,
        voiceNote: voiceNote || undefined,
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

  if (step === 'issue') {
    return (
      <AppShell width="narrow">
        <StepIndicator current="issue" />
        <PageHeader
          back={{ to: `/services/${serviceId}`, label: details.name }}
          title="What’s wrong?"
          subtitle={`Pick the closest match for your ${details.name.toLowerCase()} problem.`}
        />
        <div className="issue-grid">
          {details.issues.map((item) => (
            <IssueCard
              key={item.key}
              issue={item}
              onSelect={(selected) => navigate(bookPath(serviceId, selected.key), { replace: true })}
            />
          ))}
        </div>
      </AppShell>
    );
  }

  const isOther = issue.key === 'OTHER';

  return (
    <AppShell width="narrow">
      <StepIndicator current="details" />
      <PageHeader
        back={{ to: bookPath(serviceId), label: 'Change issue' }}
        title="Tell us more"
        subtitle={
          <>
            {details.name} · <strong>{issue.label}</strong>{' '}
            <Link to={bookPath(serviceId)} className="text-link">
              change
            </Link>
          </>
        }
      />

      <form className="stack" onSubmit={handleSubmit} noValidate>
        <Notice>{submit.error}</Notice>

        <Card>
          <h2 className="card__title">The problem</h2>
          <div className="form-stack">
            <TextArea
              id="description"
              label={isOther ? 'Describe the problem' : 'Anything the technician should know?'}
              rows={4}
              maxLength={2000}
              value={form.description}
              error={errors.description}
              placeholder={
                isOther
                  ? 'e.g. The unit trips the power after a few minutes.'
                  : 'e.g. Started last week, worse in the afternoon. Split AC, 1.5 ton.'
              }
              onChange={(event) => updateField('description', event.target.value)}
            />
            <ImageAttachments
              attachments={attachments}
              setAttachments={setAttachments}
              error={errors.attachments}
              hint={`Up to ${MAX_ATTACHMENTS} photos, 5MB each. Photos help providers understand the problem.`}
            />
            <VoiceRecorder value={voiceNote} onChange={setVoiceNote} disabled={submit.pending === 'create'} />
          </div>
        </Card>

        <Card>
          <h2 className="card__title">Service address</h2>
          <AddressForm form={form} errors={errors} onChange={updateField} />
        </Card>

        <Card>
          <h2 className="card__title">Preferred time</h2>
          <DateTimePicker
            date={form.preferredDate}
            time={form.preferredTime}
            errors={errors}
            onChange={updateField}
          />
        </Card>

        <div className="sticky-actions">
          <Button type="submit" block size="lg" loading={submit.pending === 'create'} loadingText="Sending…">
            Find providers
          </Button>
          <p className="field-hint" style={{ textAlign: 'center', marginTop: 10 }}>
            Next: see available providers and their quotes. Nothing is booked yet.
          </p>
        </div>
      </form>
    </AppShell>
  );
}

export default BookPage;
