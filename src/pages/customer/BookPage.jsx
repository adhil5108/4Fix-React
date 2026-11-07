import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Paperclip } from 'lucide-react';
import { AddressForm, validateAddress } from '../../components/AddressForm.jsx';
import AppShell from '../../components/AppShell.jsx';
import LocationCapture from '../../components/LocationCapture.jsx';
import ImageAttachments, { MAX_ATTACHMENTS } from '../../components/ImageAttachments.jsx';
import TextField, { TextArea } from '../../components/TextField.jsx';
import VoiceRecorder from '../../components/VoiceRecorder.jsx';
import { IssueTile, ServiceIcon } from '../../components/cards.jsx';
import { Button, ErrorState, Link, LoadingState, Notice, StickyActionBar } from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { useTranslatedErrors } from '../../hooks/useTranslatedErrors.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { saveRequestAccess } from '../../services/customerAccess.js';
import { requestsApi, servicesApi } from '../../services/fixApi.js';
import { normalizePhone, validateContact, validateProblem } from '../../utils/bookingValidation.js';
import { formatIssueLabel, formatMoney } from '../../utils/format.js';
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

const geolocationSupported = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);

// Errors are inserted in page order so the first one gets focus.
function validate(form, issueKey, attachments, { location, manualAddress }, t, step = 2) {
  const errors = validateProblem(form, issueKey, attachments, MAX_ATTACHMENTS, t);

  if (step === 1) return errors;

  if (!manualAddress && !location) {
    errors.location = t('customer.book.errors.location');
  }

  return { ...errors, ...(manualAddress ? validateAddress(form, t) : {}), ...validateContact(form, t) };
}

// One titled block of the form.
function FormSection({ id, title, children }) {
  return (
    <section className="form-section" aria-labelledby={id}>
      <h2 id={id} className="form-section__title">
        {title}
      </h2>
      {children}
    </section>
  );
}

// Two short steps: describe the problem, then share location and contact details.
// Keep media mounted when switching steps so uploads and recordings retain state.
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
  const [issueOpen, setIssueOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [mediaOpen, setMediaOpen] = useState(false);
  const stepTitleRef = useRef(null);
  // In-flight/failed uploads from the photo and voice pickers: sending waits for them.
  const [photoStatus, setPhotoStatus] = useState({ uploading: false, failed: false });
  const [voiceStatus, setVoiceStatus] = useState({ uploading: false, recording: false, failed: false });
  const submitErrorRef = useRef(null);
  const issueGridRef = useRef(null);
  const issueChangeRef = useRef(null);
  const details = service.data?.service;
  const validIssueKey = details?.issues.some((item) => item.key === issueKey) ? issueKey : '';
  useTranslatedErrors(setErrors, () =>
    validate(form, validIssueKey, attachments, { location, manualAddress }, t, step),
  );
  const submit = useAction();

  useEffect(() => {
    stepTitleRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step, service.loading]);

  // A server-side failure is shown at the end of the form; bring it into view.
  useEffect(() => {
    if (submit.error) {
      submitErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      submitErrorRef.current?.focus({ preventScroll: true });
    }
  }, [submit.error]);

  const fallbackBack = { to: '/services', label: t('customer.book.allServices') };

  if (service.loading) {
    return (
      <AppShell title={t('customer.book.title')} back={fallbackBack} nav={false}>
        <LoadingState label={t('customer.book.loading')} />
      </AppShell>
    );
  }

  if (service.error) {
    return (
      <AppShell title={t('customer.book.title')} back={fallbackBack} nav={false}>
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
  const showIssueGrid = !issue || issueOpen;
  const uploadBlock = voiceStatus.recording
    ? 'recording'
    : photoStatus.uploading || voiceStatus.uploading
      ? 'uploading'
      : photoStatus.failed || voiceStatus.failed
        ? 'failed'
        : null;
  const changeTo = details.category?.id ? categoryPath(details.category.id) : '/services';
  const back = { to: changeTo, label: t(step === 2 ? 'customer.book.steps.back' : 'customer.book.allServices') };
  if (step === 2) {
    back.onClick = (event) => {
      event.preventDefault();
      goToProblem();
    };
  }

  function goToProblem() {
    if (busy) return;
    setErrors({});
    submit.setError('');
    setStep(1);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    submit.setError('');
  }

  function chooseIssue(selected) {
    setIssueKey(selected.key);
    setIssueOpen(false);
    setErrors((current) => ({ ...current, issue: '' }));
    submit.setError('');
    // Back to the summary; keep keyboard focus on its "Change" button.
    window.setTimeout(() => issueChangeRef.current?.focus(), 0);
  }

  function openIssues() {
    setIssueOpen(true);
    window.setTimeout(() => issueGridRef.current?.focus(), 0);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (uploadBlock || busy) {
      return;
    }

    const nextErrors = validate(form, validIssueKey, attachments, { location, manualAddress }, t, step);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const first = Object.keys(nextErrors)[0];
      if (['issue', 'description', 'attachments'].includes(first)) {
        setStep(1);
        if (first === 'attachments') setMediaOpen(true);
      }
      window.setTimeout(() => {
        const target = document.getElementById(first === 'issue' ? 'book-issues' : first);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target?.focus?.({ preventScroll: true });
      }, 0);
      return;
    }

    if (step === 1) {
      setErrors({});
      setStep(2);
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
      // Replace the form in the history: Back must not reopen it, empty, to send again.
      navigate(`/requests/${result.request.id}?created=1`, { replace: true });
    });
  }

  return (
    <AppShell title={t('customer.book.title')} back={back} nav={false} bar>
      <ol className="booking-steps" aria-label={t('customer.book.steps.label')}>
        {['problem', 'visit'].map((key, index) => (
          <li key={key} className={step >= index + 1 ? 'is-active' : ''} aria-current={step === index + 1 ? 'step' : undefined}>
            <span className="booking-steps__number">{step > index + 1 ? <Check aria-hidden="true" /> : index + 1}</span>
            <span>{t(`customer.book.steps.${key}`)}</span>
          </li>
        ))}
      </ol>
      <header className="booking-heading">
        <p className="eyebrow">{t('customer.book.steps.count', { step })}</p>
        <h2 ref={stepTitleRef} tabIndex={-1}>{t(`customer.book.steps.${step === 1 ? 'problemTitle' : 'visitTitle'}`)}</h2>
        <p>{t(`customer.book.steps.${step === 1 ? 'problemHint' : 'visitHint'}`)}</p>
      </header>
      <form id="book-form" className="book-form" onSubmit={handleSubmit} noValidate>
        <div className="summary-row booking-service">
          <ServiceIcon service={details} />
          <div className="summary-row__text">
            <span className="summary-row__title">{details.name}</span>
            <span className="summary-row__sub">{step === 2 && issue ? formatIssueLabel(issue.key, issue.label) : details.description}</span>
            {details.startingPrice != null ? <span className="booking-service__price">{t('cards.serviceCard.from', { price: formatMoney(details.startingPrice) })}</span> : null}
          </div>
          {step === 1 ? <Link to={changeTo} className="link">
            {t('customer.book.change')}
          </Link> : <button type="button" className="link" onClick={goToProblem} disabled={busy}>{t('customer.book.change')}</button>}
        </div>

        <div className="book-step" hidden={step !== 1}>
          <FormSection id="book-issue" title={t('customer.book.sections.issue')}>
            {showIssueGrid ? (
              <div
                id="book-issues"
                ref={issueGridRef}
                className="issue-grid"
                role="group"
                tabIndex={-1}
                aria-labelledby="book-issue"
                aria-describedby={errors.issue ? 'book-issues-error' : undefined}
              >
                {details.issues.map((item) => (
                  <IssueTile key={item.key} issue={item} selected={item.key === validIssueKey} onSelect={chooseIssue} />
                ))}
              </div>
            ) : (
              <div className="summary-row">
                <div className="summary-row__text">
                  <span className="summary-row__title">{formatIssueLabel(issue.key, issue.label)}</span>
                  {issue.description ? <span className="summary-row__sub">{issue.description}</span> : null}
                </div>
                <button
                  ref={issueChangeRef}
                  type="button"
                  className="link"
                  aria-expanded={false}
                  aria-label={t('customer.book.changeIssue')}
                  onClick={openIssues}
                >
                  {t('customer.book.change')}
                </button>
              </div>
            )}
            {errors.issue ? (
              <p id="book-issues-error" className="field-error">
                {errors.issue}
              </p>
            ) : null}

            <div className="booking-description">
              <TextArea
                id="description"
                label={isOther ? t('customer.book.describeLabel') : t('customer.book.anythingLabel')}
                hint={t('customer.book.descriptionHint')}
                required
                rows={3}
                maxLength={2000}
                value={form.description}
                error={errors.description}
                placeholder={isOther ? t('customer.book.describePlaceholder') : t('customer.book.anythingPlaceholder')}
                onChange={(event) => updateField('description', event.target.value)}
              />
            </div>
          </FormSection>

          <details className="booking-media" open={mediaOpen} onToggle={(event) => setMediaOpen(event.currentTarget.open)}>
            <summary><Paperclip aria-hidden="true" /><span>{t('customer.book.steps.addMedia')}<small>{t('customer.book.optional')}</small></span><ChevronDown aria-hidden="true" /></summary>
            <div className="form-stack booking-media__body">
              <ImageAttachments
                attachments={attachments}
                setAttachments={setAttachments}
                error={errors.attachments}
                label={t('customer.book.photosLabel')}
                hint={t('customer.book.photosHint', { max: MAX_ATTACHMENTS })}
                onStatusChange={setPhotoStatus}
              />
              <VoiceRecorder value={voiceNote} onChange={setVoiceNote} disabled={busy} onStatusChange={setVoiceStatus} />
            </div>
          </details>
        </div>

        {step === 2 ? (
          <div className="book-step">
            <FormSection id="book-location" title={t('customer.book.sections.location')}>
              {manualAddress ? (
                <div className="form-stack">
                  <AddressForm form={form} errors={errors} onChange={updateField} />
                  {geolocationSupported ? (
                    <button type="button" className="link location-switch" onClick={() => setManualAddress(false)}>
                      {t('customer.book.useLocation')}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="form-stack">
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
                  <button type="button" className="link location-switch" onClick={() => setManualAddress(true)}>
                    {t('customer.book.enterManually')}
                  </button>
                </div>
              )}
            </FormSection>

            <FormSection id="book-contact" title={t('customer.book.sections.contact')}>
              <p className="field-hint section-hint">{t('customer.book.details.hint')}</p>
              <div className="form-stack">
                <TextField
                  id="customerName"
                  label={t('customer.book.details.name')}
                  autoComplete="name"
                  maxLength={120}
                  required
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
                  required
                  value={form.customerPhone}
                  error={errors.customerPhone}
                  placeholder={t('customer.book.details.phonePlaceholder')}
                  onChange={(event) => updateField('customerPhone', event.target.value)}
                />
              </div>
            </FormSection>
            <p className="booking-reassurance"><Check aria-hidden="true" />{t('customer.book.steps.priceNote')}</p>
          </div>
        ) : null}

        <div ref={submitErrorRef} tabIndex={-1} className="book-form__error">
          <Notice>{submit.error}</Notice>
        </div>
      </form>

      <StickyActionBar
        lead={
          <>
            {uploadBlock ? (
              <p className="sticky-bar__status" role="status">
                {t(`customer.book.uploads.${uploadBlock}`)}
              </p>
            ) : null}
            {step === 2 ? <p className="sticky-bar__explain">{t('customer.book.footnote')}</p> : null}
          </>
        }
      >
        <div className="booking-actions">
          {step === 2 ? (
            <Button variant="secondary" icon={ArrowLeft} disabled={busy} onClick={goToProblem}>
              {t('customer.book.steps.back')}
            </Button>
          ) : null}
          <Button
            key={step}
            type="submit"
            form="book-form"
            block
            size="lg"
            loading={busy}
            loadingText={t('customer.book.sending')}
            disabled={Boolean(uploadBlock)}
            icon={step === 1 ? ArrowRight : undefined}
          >
            {t(step === 1 ? 'customer.book.steps.continue' : 'customer.book.submit')}
          </Button>
        </div>
      </StickyActionBar>
    </AppShell>
  );
}

export default BookPage;
