import { useState } from 'react';
import AppShell from '../../components/AppShell.jsx';
import { LifecycleActions } from '../../components/JobActions.jsx';
import TextField, { TextArea } from '../../components/TextField.jsx';
import { AddressBlock, AttachmentList, QuoteCard } from '../../components/cards.jsx';
import {
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  DetailList,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  StatusBadge,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { providerApi, requestsApi } from '../../services/fixApi.js';
import { formatMoney, formatSlot, formatTimestamp } from '../../utils/format.js';

const QUOTABLE = ['PENDING', 'QUOTE_RECEIVED'];
const MAX_AMOUNT = 10000000;

function validateQuote({ amount, description }) {
  const errors = {};
  const trimmedAmount = amount.trim();
  const value = Number(trimmedAmount);

  if (!trimmedAmount) {
    errors.amount = 'Enter your price.';
  } else if (!/^\d+(\.\d{1,2})?$/.test(trimmedAmount) || !Number.isFinite(value) || value <= 0) {
    errors.amount = 'Enter a price greater than 0 (up to 2 decimals).';
  } else if (value > MAX_AMOUNT) {
    errors.amount = 'Price must be ₹1,00,00,000 or less.';
  }

  const length = description.trim().length;
  if (length < 3) {
    errors.description = 'Describe the work in at least 3 characters.';
  } else if (length > 1000) {
    errors.description = 'Description must be 1000 characters or fewer.';
  }

  return errors;
}

function QuoteForm({ previouslyRejected, busy, onSubmit }) {
  const [form, setForm] = useState({ amount: '', description: '' });
  const [errors, setErrors] = useState({});

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateQuote(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const ok = await onSubmit({
      amount: Number(form.amount.trim()),
      description: form.description.trim(),
    });

    if (ok) {
      setForm({ amount: '', description: '' });
    }
  }

  return (
    <Card>
      <h2 className="card__title">{previouslyRejected ? 'Send a new quote' : 'Send a quote'}</h2>
      {previouslyRejected ? (
        <p className="body-text">The customer declined your earlier quote. You can send a revised one.</p>
      ) : null}
      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        <TextField
          id="amount"
          label="Price (₹)"
          type="text"
          inputMode="decimal"
          value={form.amount}
          error={errors.amount}
          placeholder="e.g. 1850"
          onChange={(event) => update('amount', event.target.value.replace(/[^\d.]/g, ''))}
        />
        <TextArea
          id="quoteDescription"
          label="What’s included"
          rows={3}
          maxLength={1000}
          value={form.description}
          error={errors.description}
          placeholder="e.g. AC service and gas refill, parts included"
          onChange={(event) => update('description', event.target.value)}
        />
        <Button type="submit" block loading={busy} loadingText="Sending quote…">
          Send quote
        </Button>
      </form>
    </Card>
  );
}

function ProviderRequestDetailsPage({ requestId }) {
  const { user } = useAuth();
  const data = useApi(async () => {
    const [requestResult, quotesResult] = await Promise.all([
      providerApi.getRequest(requestId),
      requestsApi.quotes(requestId),
    ]);
    const request = requestResult.request;
    // Once the customer confirms, the booking-centric job page takes over.
    const isSelected = request.selectedProviderId === user.id;
    const job = isSelected
      ? (await providerApi.jobs()).jobs.find((item) => item.id === request.id) || null
      : null;
    return { request, quotes: quotesResult.quotes, job };
  }, [requestId]);
  const action = useAction();
  const [confirm, setConfirm] = useState(null);
  const [success, setSuccess] = useState('');

  const back = { to: '/provider/requests', label: 'Requests' };

  if (data.loading) {
    return (
      <AppShell>
        <LoadingState label="Loading request…" />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    const error =
      data.error.status === 403
        ? { status: 403, message: 'This request is no longer open, or another provider is handling it.' }
        : data.error.status === 400
          ? { status: 404, message: 'This request could not be found.' }
          : data.error;

    return (
      <AppShell>
        <PageHeader title="Request" back={back} />
        <ErrorState error={error} onRetry={data.reload} />
      </AppShell>
    );
  }

  const { request, quotes, job } = data.data;
  const isSelected = request.selectedProviderId === user.id;
  const activeQuote = quotes.find((quote) => quote.status === 'PENDING' || quote.status === 'ACCEPTED');
  const hasRejectedQuote = quotes.some((quote) => quote.status === 'REJECTED');
  const canQuote = QUOTABLE.includes(request.status) && !activeQuote && !isSelected;
  const lostJob = !isSelected && Boolean(request.selectedProviderId) && request.status !== 'CANCELLED';

  async function perform(key, operation, message) {
    setSuccess('');
    const ok = await action.run(key, operation);
    setConfirm(null);

    if (ok) {
      setSuccess(message);
    }

    await data.refresh();
    return ok;
  }

  const confirmContent = {
    start: {
      title: 'Start this service?',
      message: 'The customer will see that work is in progress. This can’t be undone.',
      confirmLabel: 'Start service',
      run: () => perform('start', () => providerApi.start(request.id), 'Service started.'),
    },
    complete: {
      title: 'Mark service as complete?',
      message: 'Only do this once the work is finished. This can’t be undone.',
      confirmLabel: 'Mark complete',
      run: () => perform('complete', () => providerApi.complete(request.id), 'Service marked as complete.'),
    },
  }[confirm];

  return (
    <AppShell>
      <PageHeader
        back={back}
        title={request.service?.name || 'Service request'}
        subtitle={`${request.issueLabel ? `${request.issueLabel} · ` : ''}posted ${formatTimestamp(request.createdAt)}`}
        actions={<StatusBadge status={request.status} audience="provider" />}
      />

      <div className="stack">
        <Notice tone="success">{success}</Notice>
        <Notice>{action.error}</Notice>
        {data.error ? <Notice>{data.error.message}</Notice> : null}
      </div>

      <div className="detail-layout">
        <div className="detail-layout__main">
          {isSelected && job?.bookingId ? (
            <Card className="card--accent">
              <h2 className="card__title">Booking confirmed</h2>
              <p className="body-text">
                The customer confirmed this booking. Manage the visit, tracking and chat from the job page.
              </p>
              <ButtonLink to={`/provider/jobs/${job.bookingId}`} block>
                Open job
              </ButtonLink>
            </Card>
          ) : null}

          {isSelected && !job?.bookingId ? (
            <>
              {request.status === 'QUOTE_ACCEPTED' ? (
                <Notice tone="info">
                  The customer chose your quote and is confirming the booking. You can already propose a visit time.
                </Notice>
              ) : null}
              <LifecycleActions
                request={request}
                pending={action.pending}
                onSchedule={(payload) =>
                  perform('schedule', () => providerApi.schedule(request.id, payload), 'Visit scheduled.')
                }
                onRequestConfirm={setConfirm}
              />
              {request.status === 'COMPLETED' ? (
                <Card>
                  <h2 className="card__title">Job completed</h2>
                  <p className="body-text">Nice work — this job is finished.</p>
                </Card>
              ) : null}
            </>
          ) : null}

          {request.status === 'CANCELLED' ? (
            <Card>
              <h2 className="card__title">Request cancelled</h2>
              <p className="body-text">The customer cancelled this request.</p>
            </Card>
          ) : null}

          {lostJob ? (
            <Card>
              <h2 className="card__title">Another provider was chosen</h2>
              <p className="body-text">The customer accepted a different quote for this job.</p>
            </Card>
          ) : null}

          {activeQuote?.status === 'PENDING' && QUOTABLE.includes(request.status) ? (
            <Notice tone="info">Your quote was sent. Waiting for the customer to decide.</Notice>
          ) : null}

          {canQuote ? (
            <QuoteForm
              previouslyRejected={hasRejectedQuote}
              busy={action.pending === 'quote'}
              onSubmit={(payload) =>
                perform('quote', () => providerApi.submitQuote(request.id, payload), 'Quote sent. The customer will review it.')
              }
            />
          ) : null}

          {quotes.length > 0 ? (
            <section className="section section--tight" aria-labelledby="own-quotes-heading">
              <h2 id="own-quotes-heading" className="section__title">
                Your quotes
              </h2>
              <div className="list">
                {quotes.map((quote) => (
                  <QuoteCard key={quote.id} quote={quote} showProvider={false} highlight={quote.status === 'ACCEPTED'} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="detail-layout__side">
          <Card>
            <h2 className="card__title">Job details</h2>
            <DetailList
              items={[
                { label: 'Customer', value: request.customer?.name },
                { label: 'Issue', value: request.issueLabel },
                { label: 'Problem', value: request.description },
                { label: 'Preferred time', value: formatSlot(request.preferredDate, request.preferredTime) },
                {
                  label: 'Scheduled visit',
                  value: request.scheduledDate ? formatSlot(request.scheduledDate, request.scheduledTime) : '',
                },
                { label: 'Your price', value: isSelected && activeQuote ? formatMoney(activeQuote.amount) : '' },
              ]}
            />
            <h3 className="card__subtitle">Service address</h3>
            <AddressBlock address={request.address} />
            {request.attachments?.length ? (
              <>
                <h3 className="card__subtitle">Attachments</h3>
                <AttachmentList attachments={request.attachments} />
              </>
            ) : null}
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(confirmContent)}
        title={confirmContent?.title}
        message={confirmContent?.message}
        confirmLabel={confirmContent?.confirmLabel}
        busy={Boolean(action.pending)}
        onConfirm={() => confirmContent?.run()}
        onCancel={() => setConfirm(null)}
      />
    </AppShell>
  );
}

export default ProviderRequestDetailsPage;
