import { useEffect, useRef, useState } from 'react';
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
import { bookPath } from '../public/publicLinks.js';
import { formatAddress, formatIssueLabel } from '../../utils/format.js';

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
function validate(form, attachments, { location, manualAddress }, t) {
  const errors = {};
  const length = form.description.trim().length;

  if (length === 0) errors.description = t('customer.book.errors.descriptionRequired');
  else if (length < 5) errors.description = t('customer.book.errors.descriptionShort');
  else if (length > 2000) errors.description = t('customer.book.errors.descriptionLong');

  if (attachments.length > MAX_ATTACHMENTS) {
    errors.attachments = t('customer.book.errors.attachments', { max: MAX_ATTACHMENTS });
  }

  const name = form.customerName.trim();
  if (!name) errors.customerName = t('customer.book.errors.nameRequired');
  else if (name.length < 2) errors.customerName = t('customer.book.errors.nameShort');
  else if (name.length > 120) errors.customerName = t('customer.book.errors.nameLong');

  const phone = normalizePhone(form.customerPhone);
  if (!phone) errors.customerPhone = t('customer.book.errors.phoneRequired');
  else if (!PHONE_PATTERN.test(phone)) errors.customerPhone = t('customer.book.errors.phoneInvalid');

  if (!manualAddress && !location) {
    errors.location = t('customer.book.errors.location');
  }

  return manualAddress ? { ...errors, ...validateAddress(form, t) } : errors;
}

// The conversation, one question at a time. Each step owns the form fields it asks for,
// so "Continue" validates just those (with the same rules as the final submit).
const STEPS = [
  { key: 'description', fields: ['description'] },
  { key: 'photos', fields: ['attachments'], optional: true },
  { key: 'voice', fields: [], optional: true },
  { key: 'location', fields: ['location', 'addressLine', 'city', 'state', 'pincode'] },
  { key: 'name', fields: ['customerName'] },
  { key: 'phone', fields: ['customerPhone'] },
  { key: 'review', fields: [] },
];

function BotMessage({ children }) {
  return (
    <div className="convo-row convo-row--bot">
      <span className="convo-avatar" aria-hidden="true">
        4
      </span>
      <div className="convo-bubble convo-bubble--bot">{children}</div>
    </div>
  );
}

// The customer's answer to a finished step, with a way back to change it.
function ReplyMessage({ children, onEdit }) {
  const { t } = useTranslation();

  return (
    <div className="convo-row convo-row--me">
      <div className="convo-bubble convo-bubble--me">
        {children}
        {onEdit ? (
          <button type="button" className="convo-edit" onClick={onEdit}>
            {t('customer.book.chat.edit')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Thumbnails({ urls }) {
  return (
    <div className="convo-thumbs">
      {urls.map((url) => (
        <img key={url} src={url} alt="" className="convo-thumb" loading="lazy" />
      ))}
    </div>
  );
}

function VoiceBubble({ voiceNote }) {
  const { t } = useTranslation();

  return (
    <div className="convo-voice">
      <span className="convo-voice__icon" aria-hidden="true">
        🎤
      </span>
      <audio controls preload="none" src={voiceNote.url} aria-label={t('customer.book.chat.voiceSent')} />
    </div>
  );
}

function IssueStep({ serviceId, details }) {
  const { t } = useTranslation();

  return (
    <AppShell>
      <div className="convo">
        <PageHeader
          back={{ to: `/services/${serviceId}`, label: details.name }}
          title={
            <span className="service-inline">
              <ServiceIcon service={details} size="sm" />
              {details.name}
            </span>
          }
        />
        <BotMessage>
          <p>{t('customer.book.chat.greeting')}</p>
          <p className="convo-bubble__sub">{t('customer.book.chat.pickIssue')}</p>
        </BotMessage>
        <div className="convo-options issue-grid">
          {details.issues.map((item) => (
            <IssueCard
              key={item.key}
              issue={item}
              onSelect={(selected) => navigate(bookPath(serviceId, selected.key), { replace: true })}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
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
  // `active` is the question being answered; everything up to `reached` stays mounted
  // (photos keep uploading and the recording is kept while the customer moves on).
  const [active, setActive] = useState(0);
  const [reached, setReached] = useState(0);
  const activeRef = useRef(null);
  useTranslatedErrors(setErrors, () => validate(form, attachments, { location, manualAddress }, t));
  const submit = useAction();

  // Bring the current question into view (one-handed use: it sits near the bottom).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [active]);

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

  if (!issue) {
    return <IssueStep serviceId={serviceId} details={details} />;
  }

  const isOther = issue.key === 'OTHER';

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    submit.setError('');
  }

  // Validate only the current step's fields, then move on. After editing an earlier
  // answer, jump back to where the customer had got to.
  function continueFrom(index) {
    const allErrors = validate(form, attachments, { location, manualAddress }, t);
    const stepErrors = Object.fromEntries(
      Object.entries(allErrors).filter(([field]) => STEPS[index].fields.includes(field)),
    );

    if (Object.keys(stepErrors).length > 0) {
      setErrors((current) => ({ ...current, ...stepErrors }));
      document.getElementById(Object.keys(stepErrors)[0])?.focus();
      return;
    }

    const next = index < reached ? reached : index + 1;
    setActive(next);
    setReached((current) => Math.max(current, next));
  }

  async function handleSubmit() {
    const nextErrors = validate(form, attachments, { location, manualAddress }, t);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstField = Object.keys(nextErrors)[0];
      setActive(STEPS.findIndex((step) => step.fields.includes(firstField)));
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

  const busy = submit.pending === 'create';
  const locationText = manualAddress
    ? formatAddress({
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
      })
    : location?.address?.trim()
      ? t('customer.book.chat.locationSharedWith', { landmark: location.address.trim() })
      : t('customer.book.chat.locationShared');

  // What each finished step shows as the customer's reply bubble.
  const answers = {
    description: <p className="convo-bubble__text">{form.description.trim()}</p>,
    photos: attachments.length ? (
      <>
        <Thumbnails urls={attachments} />
        <p className="convo-bubble__meta">{t('customer.book.chat.photoCount', { count: attachments.length })}</p>
      </>
    ) : (
      <p className="convo-bubble__meta">{t('customer.book.chat.noPhotos')}</p>
    ),
    voice: voiceNote ? <VoiceBubble voiceNote={voiceNote} /> : <p className="convo-bubble__meta">{t('customer.book.chat.noVoice')}</p>,
    location: <p className="convo-bubble__text">📍 {locationText}</p>,
    name: <p className="convo-bubble__text">{form.customerName.trim()}</p>,
    phone: <p className="convo-bubble__text">{form.customerPhone.trim()}</p>,
  };

  // The input for each step. Kept mounted once reached, shown only while active.
  function composer(step, index) {
    const continueButton = (label = t('customer.book.chat.continue')) => (
      <Button size="lg" block onClick={() => continueFrom(index)} disabled={busy}>
        {label}
      </Button>
    );

    switch (step.key) {
      case 'description':
        return (
          <>
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
            {continueButton()}
          </>
        );
      case 'photos':
        return (
          <>
            <ImageAttachments
              attachments={attachments}
              setAttachments={setAttachments}
              error={errors.attachments}
              hint={t('customer.book.photosHint', { max: MAX_ATTACHMENTS })}
            />
            {continueButton(attachments.length ? t('customer.book.chat.continue') : t('customer.book.chat.skip'))}
          </>
        );
      case 'voice':
        return (
          <>
            <VoiceRecorder value={voiceNote} onChange={setVoiceNote} disabled={busy} />
            {continueButton(voiceNote ? t('customer.book.chat.continue') : t('customer.book.chat.skip'))}
          </>
        );
      case 'location':
        return (
          <>
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
            {continueButton()}
          </>
        );
      case 'name':
        return (
          <>
            <TextField
              id="customerName"
              label={t('customer.book.details.name')}
              autoComplete="name"
              maxLength={120}
              value={form.customerName}
              error={errors.customerName}
              placeholder={t('customer.book.details.namePlaceholder')}
              onChange={(event) => updateField('customerName', event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), continueFrom(index))}
            />
            {continueButton()}
          </>
        );
      case 'phone':
        return (
          <>
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
              hint={t('customer.book.details.hint')}
              onChange={(event) => updateField('customerPhone', event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), continueFrom(index))}
            />
            {continueButton()}
          </>
        );
      case 'review':
        return (
          <>
            <dl className="convo-summary">
              <SummaryRow label={t('customer.shared.service')} value={details.name} />
              <SummaryRow label={t('customer.shared.issue')} value={formatIssueLabel(issue.key, issue.label)} />
              <SummaryRow label={t('customer.book.chat.summary.problem')} value={form.description.trim()} onEdit={() => setActive(0)} />
              <SummaryRow
                label={t('customer.book.chat.summary.photos')}
                value={attachments.length ? t('customer.book.chat.photoCount', { count: attachments.length }) : t('customer.book.chat.noPhotos')}
                onEdit={() => setActive(1)}
              />
              <SummaryRow
                label={t('customer.book.chat.summary.voice')}
                value={voiceNote ? t('customer.book.chat.voiceAdded') : t('customer.book.chat.noVoice')}
                onEdit={() => setActive(2)}
              />
              <SummaryRow label={t('customer.book.chat.summary.location')} value={locationText} onEdit={() => setActive(3)} />
              <SummaryRow label={t('customer.book.details.name')} value={form.customerName.trim()} onEdit={() => setActive(4)} />
              <SummaryRow label={t('customer.book.details.phone')} value={form.customerPhone.trim()} onEdit={() => setActive(5)} />
            </dl>
            <Notice>{submit.error}</Notice>
            <Button size="lg" block onClick={handleSubmit} loading={busy} loadingText={t('customer.book.sending')}>
              {t('customer.book.submit')}
            </Button>
            <p className="field-hint convo-footnote">{t('customer.book.footnote')}</p>
          </>
        );
      default:
        return null;
    }
  }

  return (
    <AppShell>
      <div className="convo">
        <PageHeader
          back={{ to: bookPath(serviceId), label: t('customer.book.changeIssue') }}
          title={
            <span className="service-inline">
              <ServiceIcon service={details} size="sm" />
              {details.name}
            </span>
          }
          subtitle={t('customer.book.chat.subtitle')}
        />

        <BotMessage>
          <p>{t('customer.book.chat.greeting')}</p>
          <p className="convo-bubble__sub">{t('customer.book.chat.pickIssue')}</p>
        </BotMessage>
        <ReplyMessage>
          <p className="convo-bubble__text">
            {formatIssueLabel(issue.key, issue.label)}{' '}
            <Link to={bookPath(serviceId)} className="convo-edit">
              {t('customer.book.change')}
            </Link>
          </p>
        </ReplyMessage>

        {STEPS.map((step, index) => {
          if (index > reached) return null;
          const isActive = index === active;

          return (
            <div key={step.key} className="convo-step">
              <BotMessage>
                <p>{t(`customer.book.chat.ask.${step.key}${step.key === 'description' && isOther ? 'Other' : ''}`)}</p>
              </BotMessage>
              {!isActive && step.key !== 'review' ? (
                <ReplyMessage onEdit={busy ? null : () => setActive(index)}>{answers[step.key]}</ReplyMessage>
              ) : null}
              {/* Mounted once reached so uploads/recordings/location survive; hidden unless active. */}
              <div ref={isActive ? activeRef : null} className="convo-composer form-stack" hidden={!isActive}>
                {composer(step, index)}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function SummaryRow({ label, value, onEdit }) {
  const { t } = useTranslation();

  return (
    <div className="convo-summary__row">
      <dt>{label}</dt>
      <dd>
        <span className="convo-summary__value">{value}</span>
        {onEdit ? (
          <button type="button" className="convo-edit" onClick={onEdit}>
            {t('customer.book.chat.edit')}
          </button>
        ) : null}
      </dd>
    </div>
  );
}

export default BookPage;
