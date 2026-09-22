import { useState } from 'react';
import { AddressForm, DateTimePicker, validateAddress, validateDateTime } from '../../components/AddressForm.jsx';
import AppShell from '../../components/AppShell.jsx';
import StepIndicator from '../../components/StepIndicator.jsx';
import { TextArea } from '../../components/TextField.jsx';
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

const MAX_ATTACHMENTS = 10;

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

function Attachments({ attachments, setAttachments, error }) {
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState('');

  function add() {
    const value = draft.trim();
    if (!value) return setDraftError('Enter a link or note to attach.');
    if (value.length > 500) return setDraftError('Attachments must be 500 characters or fewer.');
    if (attachments.length >= MAX_ATTACHMENTS) return setDraftError(`You can add up to ${MAX_ATTACHMENTS}.`);
    setAttachments([...attachments, value]);
    setDraft('');
    setDraftError('');
    return undefined;
  }

  return (
    <div className="field">
      <label htmlFor="attachmentDraft">Photos or links (optional)</label>
      <div className="inline-input">
        <div className={`field-control${draftError || error ? ' field-control--error' : ''}`}>
          <input
            id="attachmentDraft"
            className="field-input"
            type="text"
            value={draft}
            maxLength={500}
            placeholder="Paste a photo link or add a note"
            disabled={attachments.length >= MAX_ATTACHMENTS}
            onChange={(event) => {
              setDraft(event.target.value);
              setDraftError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                add();
              }
            }}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={add} disabled={attachments.length >= MAX_ATTACHMENTS}>
          Add
        </Button>
      </div>
      {draftError || error ? (
        <p className="field-error">{draftError || error}</p>
      ) : (
        <p className="field-hint">
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
                onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                aria-label={`Remove attachment ${index + 1}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function BookPage({ serviceId }) {
  const issueKey = (useQueryParam('issue') || '').toUpperCase();
  const service = useApi(() => servicesApi.get(serviceId), [serviceId]);
  const [form, setForm] = useState(initialForm);
  const [attachments, setAttachments] = useState([]);
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
            <Attachments attachments={attachments} setAttachments={setAttachments} error={errors.attachments} />
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
