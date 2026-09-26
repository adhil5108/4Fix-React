import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddressForm, validateAddress } from '../../components/AddressForm.jsx';
import AppShell from '../../components/AppShell.jsx';
import LocationCapture from '../../components/LocationCapture.jsx';
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
import { useTranslatedErrors } from '../../hooks/useTranslatedErrors.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { saveRequestAccess } from '../../services/customerAccess.js';
import { requestsApi, servicesApi } from '../../services/fixApi.js';
import { bookPath } from '../public/publicLinks.js';
import { formatIssueLabel } from '../../utils/format.js';

const initialForm = {
  description: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
};

const geolocationSupported = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);

function validate(form, attachments, { location, manualAddress }, t) {
  const length = form.description.trim().length;
  const errors = manualAddress ? validateAddress(form, t) : {};

  if (!manualAddress && !location) {
    errors.location = t('customer.book.errors.location');
  }

  if (length === 0) errors.description = t('customer.book.errors.descriptionRequired');
  else if (length < 5) errors.description = t('customer.book.errors.descriptionShort');
  else if (length > 2000) errors.description = t('customer.book.errors.descriptionLong');

  if (attachments.length > MAX_ATTACHMENTS) {
    errors.attachments = t('customer.book.errors.attachments', { max: MAX_ATTACHMENTS });
  }

  return errors;
}

function BookPage({ serviceId }) {
  const { t } = useTranslation();
  const issueKey = (useQueryParam('issue') || '').toUpperCase();
  const service = useApi(() => servicesApi.get(serviceId), [serviceId]);
  const [form, setForm] = useState(initialForm);
  const [attachments, setAttachments] = useState([]);
  const [voiceNote, setVoiceNote] = useState(null);
  const [location, setLocation] = useState(null);
  const [manualAddress, setManualAddress] = useState(!geolocationSupported);
  const [errors, setErrors] = useState({});
  useTranslatedErrors(setErrors, () => validate(form, attachments, { location, manualAddress }, t));
  const submit = useAction();

  if (service.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState label={t('customer.book.loading')} />
      </AppShell>
    );
  }

  if (service.error) {
    return (
      <AppShell width="narrow">
        <PageHeader title={t('customer.book.title')} back={{ to: '/services', label: t('customer.book.allServices') }} />
        <ErrorState
          error={
            [400, 404].includes(service.error.status)
              ? { status: 404, message: t('customer.book.unavailable') }
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
    const nextErrors = validate(form, attachments, { location, manualAddress }, t);

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
        // Coordinates are the navigation target; the typed address is only a fallback.
        ...(manualAddress
          ? {
              address: {
                addressLine: form.addressLine.trim(),
                city: form.city.trim(),
                state: form.state.trim(),
                pincode: form.pincode.trim(),
              },
            }
          : {
              location: {
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address?.trim() || undefined,
              },
            }),
      });

      // No account: this browser keeps the request's access token so the customer can
      // follow it (the request page also offers a private link to keep elsewhere).
      saveRequestAccess(result.request.id, result.accessToken);
      navigate(`/requests/${result.request.id}?created=1`);
    });
  }

  if (step === 'issue') {
    return (
      <AppShell width="narrow">
        <StepIndicator current="issue" />
        <PageHeader
          back={{ to: `/services/${serviceId}`, label: details.name }}
          title={t('customer.book.issueTitle')}
          subtitle={t('customer.book.issueSubtitle', { service: details.name })}
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
        back={{ to: bookPath(serviceId), label: t('customer.book.changeIssue') }}
        title={t('customer.book.detailsTitle')}
        subtitle={
          <>
            {details.name} · <strong>{formatIssueLabel(issue.key, issue.label)}</strong>{' '}
            <Link to={bookPath(serviceId)} className="text-link">
              {t('customer.book.change')}
            </Link>
          </>
        }
      />

      <form className="stack" onSubmit={handleSubmit} noValidate>
        <Notice>{submit.error}</Notice>

        <Card>
          <h2 className="card__title">{t('customer.book.problem')}</h2>
          <div className="form-stack">
            <TextArea
              id="description"
              label={isOther ? t('customer.book.describeLabel') : t('customer.book.anythingLabel')}
              rows={4}
              maxLength={2000}
              value={form.description}
              error={errors.description}
              placeholder={
                isOther
                  ? t('customer.book.describePlaceholder')
                  : t('customer.book.anythingPlaceholder')
              }
              onChange={(event) => updateField('description', event.target.value)}
            />
          </div>
        </Card>

        <Card>
          <h2 className="card__title">
            {t('customer.book.media')} <span className="field-hint">{t('customer.book.optional')}</span>
          </h2>
          <div className="form-stack">
            <ImageAttachments
              attachments={attachments}
              setAttachments={setAttachments}
              error={errors.attachments}
              hint={t('customer.book.photosHint', { max: MAX_ATTACHMENTS })}
            />
            <VoiceRecorder value={voiceNote} onChange={setVoiceNote} disabled={submit.pending === 'create'} />
          </div>
        </Card>

        <Card>
          <h2 className="card__title">{t('customer.book.location')}</h2>
          {manualAddress ? (
            <>
              <AddressForm form={form} errors={errors} onChange={updateField} />
              {geolocationSupported ? (
                <button type="button" className="text-link location-switch" onClick={() => setManualAddress(false)}>
                  {t('customer.book.useLocation')}
                </button>
              ) : null}
            </>
          ) : (
            <>
              <LocationCapture
                value={location}
                error={errors.location}
                disabled={submit.pending === 'create'}
                onChange={(next) => {
                  setLocation(next);
                  setErrors((current) => ({ ...current, location: '' }));
                  submit.setError('');
                }}
              />
              <button type="button" className="text-link location-switch" onClick={() => setManualAddress(true)}>
                {t('customer.book.enterManually')}
              </button>
            </>
          )}
        </Card>

        <div className="sticky-actions">
          <Button type="submit" block size="lg" loading={submit.pending === 'create'} loadingText={t('customer.book.sending')}>
            {t('customer.book.submit')}
          </Button>
          <p className="field-hint" style={{ textAlign: 'center', marginTop: 10 }}>
            {t('customer.book.footnote')}
          </p>
        </div>
      </form>
    </AppShell>
  );
}

export default BookPage;
