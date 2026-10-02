import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddressForm, validateAddress } from '../../components/AddressForm.jsx';
import AppShell from '../../components/AppShell.jsx';
import LocationCapture from '../../components/LocationCapture.jsx';
import ImageAttachments, { MAX_ATTACHMENTS } from '../../components/ImageAttachments.jsx';
import TextField, { TextArea } from '../../components/TextField.jsx';
import VoiceRecorder from '../../components/VoiceRecorder.jsx';
import { IssueCard, ServiceIcon } from '../../components/cards.jsx';
import { Button, ErrorState, Link, LoadingState, Notice, PageHeader } from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { useTranslatedErrors } from '../../hooks/useTranslatedErrors.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { saveRequestAccess } from '../../services/customerAccess.js';
import { requestsApi, servicesApi } from '../../services/fixApi.js';
import { categoryPath } from '../public/publicLinks.js';

const initialForm = {
  description: '',
  customerName: '',
  customerPhone: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
};

// Same rule the server applies: 8–15 digits, optional leading +, spaces/dashes allowed.
export function normalizePhone(value) {
  return value.trim().replace(/[\s().-]/g, '');
}

const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

const geolocationSupported = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);

// Errors are inserted in page order so the first one gets focus.
function validate(form, issueKey, attachments, { location, manualAddress }, t) {
  const errors = {};

  if (!issueKey) errors.issue = t('customer.book.errors.issueRequired');

  const length = form.description.trim().length;

  if (length === 0) errors.description = t('customer.book.errors.descriptionRequired');
  else if (length < 5) errors.description = t('customer.book.errors.descriptionShort');
  else if (length > 2000) errors.description = t('customer.book.errors.descriptionLong');

  if (attachments.length > MAX_ATTACHMENTS) {
    errors.attachments = t('customer.book.errors.attachments', { max: MAX_ATTACHMENTS });
  }

  if (!manualAddress && !location) {
    errors.location = t('customer.book.errors.location');
  }

  const withAddress = manualAddress ? { ...errors, ...validateAddress(form, t) } : errors;

  const name = form.customerName.trim();
  if (!name) withAddress.customerName = t('customer.book.errors.nameRequired');
  else if (name.length < 2) withAddress.customerName = t('customer.book.errors.nameShort');
  else if (name.length > 120) withAddress.customerName = t('customer.book.errors.nameLong');

  const phone = normalizePhone(form.customerPhone);
  if (!phone) withAddress.customerPhone = t('customer.book.errors.phoneRequired');
  else if (!PHONE_PATTERN.test(phone)) withAddress.customerPhone = t('customer.book.errors.phoneInvalid');

  return withAddress;
}

// One numbered, titled block of the form.
function FormSection({ number, title, optional = false, children }) {
  const { t } = useTranslation();

  return (
    <section className="card book-section" aria-labelledby={`book-section-${number}`}>
      <h2 id={`book-section-${number}`} className="book-section__title">
        <span className="book-section__number" aria-hidden="true">
          {number}
        </span>
        {title}
        {optional ? <span className="book-section__optional">{t('customer.book.optional')}</span> : null}
      </h2>
      {children}
    </section>
  );
}

// The booking form: service → issue → description → photos → voice → location → name →
// phone → send. Customers need no account; the request's access token is kept in
// this browser after sending.
function BookPage({ serviceId }) {
  const { t } = useTranslation();
  const initialIssue = (useQueryParam('issue') || '').toUpperCase();
  const service = useApi(() => servicesApi.get(serviceId), [serviceId]);
  const [issueKey, setIssueKey] = useState(initialIssue);
  const [form, setForm] = useState(initialForm);
  const [attachments, setAttachments] = useState([]);
  const [voiceNote, setVoiceNote] = useState(null);
  const [location, setLocation] = useState(null);
  const [manualAddress, setManualAddress] = useState(!geolocationSupported);
  const [errors, setErrors] = useState({});
  const details = service.data?.service;
  const validIssueKey = details?.issues.some((item) => item.key === issueKey) ? issueKey : '';
  useTranslatedErrors(setErrors, () =>
    validate(form, validIssueKey, attachments, { location, manualAddress }, t),
  );
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

  const issue = details.issues.find((item) => item.key === validIssueKey) || null;
  const isOther = issue?.key === 'OTHER';
  const busy = submit.pending === 'create';
  const back = details.category?.id
    ? { to: categoryPath(details.category.id), label: details.category.name }
    : { to: '/services', label: t('customer.book.allServices') };

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    submit.setError('');
  }

  function chooseIssue(selected) {
    setIssueKey(selected.key);
    setErrors((current) => ({ ...current, issue: '' }));
    submit.setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validate(form, validIssueKey, attachments, { location, manualAddress }, t);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const first = Object.keys(nextErrors)[0];
      const target = document.getElementById(first === 'issue' ? 'book-issues' : first);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus?.({ preventScroll: true });
      return;
    }

    await submit.run('create', async () => {
      const result = await requestsApi.create({
        serviceId,
        issueKey: issue.key,
        description: form.description.trim(),
        // Contact details for the provider who takes the job — not an account.
        customerDetails: {
          name: form.customerName.trim(),
          phone: normalizePhone(form.customerPhone),
        },
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

  return (
    <AppShell width="narrow">
      <PageHeader back={back} title={t('customer.book.title')} subtitle={t('customer.book.subtitle')} />

      <form className="book-form" onSubmit={handleSubmit} noValidate>
        <FormSection number={1} title={t('customer.book.sections.service')}>
          <div className="book-service">
            <ServiceIcon service={details} />
            <div className="book-service__text">
              <span className="book-service__name">{details.name}</span>
              {details.category?.name ? (
                <span className="book-service__category">{details.category.name}</span>
              ) : null}
            </div>
            <Link to={back.to} className="text-link book-service__change">
              {t('customer.book.change')}
            </Link>
          </div>
        </FormSection>

        <FormSection number={2} title={t('customer.book.sections.issue')}>
          <div
            id="book-issues"
            className="issue-grid"
            role="group"
            tabIndex={-1}
            aria-label={t('customer.book.sections.issue')}
            aria-describedby={errors.issue ? 'book-issues-error' : undefined}
          >
            {details.issues.map((item) => (
              <IssueCard key={item.key} issue={item} selected={item.key === validIssueKey} onSelect={chooseIssue} />
            ))}
          </div>
          {errors.issue ? (
            <p id="book-issues-error" className="field-error">
              {errors.issue}
            </p>
          ) : null}
        </FormSection>

        <FormSection number={3} title={t('customer.book.sections.description')}>
          <TextArea
            id="description"
            label={isOther ? t('customer.book.describeLabel') : t('customer.book.anythingLabel')}
            rows={4}
            maxLength={2000}
            value={form.description}
            error={errors.description}
            placeholder={isOther ? t('customer.book.describePlaceholder') : t('customer.book.anythingPlaceholder')}
            onChange={(event) => updateField('description', event.target.value)}
          />
        </FormSection>

        <FormSection number={4} title={t('customer.book.sections.photos')} optional>
          <ImageAttachments
            attachments={attachments}
            setAttachments={setAttachments}
            error={errors.attachments}
            label={t('customer.book.photosLabel')}
            hint={t('customer.book.photosHint', { max: MAX_ATTACHMENTS })}
          />
        </FormSection>

        <FormSection number={5} title={t('customer.book.sections.voice')} optional>
          <VoiceRecorder value={voiceNote} onChange={setVoiceNote} disabled={busy} />
        </FormSection>

        <FormSection number={6} title={t('customer.book.sections.location')}>
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
                disabled={busy}
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
        </FormSection>

        <FormSection number={7} title={t('customer.book.sections.contact')}>
          <p className="field-hint">{t('customer.book.details.hint')}</p>
          <div className="form-stack">
            <TextField
              id="customerName"
              label={t('customer.book.details.name')}
              autoComplete="name"
              maxLength={120}
              value={form.customerName}
              error={errors.customerName}
              placeholder={t('customer.book.details.namePlaceholder')}
              onChange={(event) => updateField('customerName', event.target.value)}
            />
            <TextField
              id="customerPhone"
              label={t('customer.book.details.phone')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              value={form.customerPhone}
              error={errors.customerPhone}
              placeholder={t('customer.book.details.phonePlaceholder')}
              onChange={(event) => updateField('customerPhone', event.target.value)}
            />
          </div>
        </FormSection>

        <div className="book-submit">
          <Notice>{submit.error}</Notice>
          <Button type="submit" block size="lg" loading={busy} loadingText={t('customer.book.sending')}>
            {t('customer.book.submit')}
          </Button>
          <p className="field-hint book-submit__note">{t('customer.book.footnote')}</p>
        </div>
      </form>
    </AppShell>
  );
}

export default BookPage;
