import { useEffect, useRef, useState } from 'react';
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
import { requestsApi, servicesApi, uploadsApi } from '../../services/fixApi.js';
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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function validateImageFile(file) {
  if (!file.type.startsWith('image/')) {
    return 'Only image files are allowed.';
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return 'Images must be 5MB or smaller.';
  }

  return '';
}

// Each picked file gets its own upload lifecycle (uploading/success/error), tracked
// locally here. Only successfully uploaded Cloudinary URLs are pushed into
// `attachments` — the array that is actually sent when the request is submitted.
function ImageAttachments({ attachments, setAttachments, error }) {
  const [items, setItems] = useState([]);
  const [pickError, setPickError] = useState('');
  const inputRef = useRef(null);
  const removedIdsRef = useRef(new Set());

  useEffect(() => {
    // Revoke every preview URL once, when the form is left.
    return () => items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadItem(item) {
    try {
      const result = await uploadsApi.image(item.file);

      if (removedIdsRef.current.has(item.id)) {
        return;
      }

      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: 'success', url: result.image.url } : entry,
        ),
      );
      setAttachments((current) => [...current, result.image.url]);
    } catch (uploadError) {
      if (removedIdsRef.current.has(item.id)) {
        return;
      }

      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: 'error', error: uploadError.message } : entry,
        ),
      );
    }
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || []);

    if (files.length === 0) {
      return;
    }

    const availableSlots = MAX_ATTACHMENTS - items.length;

    if (availableSlots <= 0) {
      setPickError(`You can add up to ${MAX_ATTACHMENTS} photos.`);
      return;
    }

    const accepted = files.slice(0, availableSlots);
    setPickError(files.length > accepted.length ? `You can add up to ${MAX_ATTACHMENTS} photos.` : '');

    const newItems = accepted.map((file) => {
      const validationError = validateImageFile(file);

      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: validationError ? 'error' : 'uploading',
        url: null,
        error: validationError,
      };
    });

    setItems((current) => [...current, ...newItems]);
    newItems.filter((item) => item.status === 'uploading').forEach(uploadItem);
  }

  function removeItem(item) {
    removedIdsRef.current.add(item.id);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    URL.revokeObjectURL(item.previewUrl);

    if (item.status === 'success' && item.url) {
      setAttachments((current) => current.filter((url) => url !== item.url));
    }
  }

  function retryItem(item) {
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, status: 'uploading', error: '' } : entry)),
    );
    uploadItem(item);
  }

  return (
    <div className="field">
      <label htmlFor="imageInput">Photos (optional)</label>
      <input
        ref={inputRef}
        id="imageInput"
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <div className="image-picker">
        {items.map((item) => (
          <div key={item.id} className={`image-picker__item image-picker__item--${item.status}`}>
            <div className="image-picker__thumb">
              <img src={item.previewUrl} alt="" />
              {item.status === 'uploading' ? (
                <span className="image-picker__overlay" aria-live="polite">
                  <span className="spinner spinner--sm" aria-hidden="true" />
                  <span className="sr-only">Uploading…</span>
                </span>
              ) : null}
              {item.status === 'success' ? (
                <span className="image-picker__badge" aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </div>
            <button
              type="button"
              className="image-picker__remove"
              onClick={() => removeItem(item)}
              aria-label="Remove photo"
            >
              ×
            </button>
            {item.status === 'error' ? (
              <div className="image-picker__error">
                <span>{item.error}</span>
                <button type="button" className="text-link" onClick={() => retryItem(item)}>
                  Retry
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {items.length < MAX_ATTACHMENTS ? (
          <button type="button" className="image-picker__add" onClick={() => inputRef.current?.click()}>
            <span aria-hidden="true">+</span>
            <span>Add photo</span>
          </button>
        ) : null}
      </div>
      {pickError || error ? (
        <p className="field-error">{pickError || error}</p>
      ) : (
        <p className="field-hint">
          Up to {MAX_ATTACHMENTS} photos, 5MB each. Photos help providers understand the problem.
        </p>
      )}
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
            <ImageAttachments attachments={attachments} setAttachments={setAttachments} error={errors.attachments} />
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
