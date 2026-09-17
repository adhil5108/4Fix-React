import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell.jsx';
import { AddressBlock, AttachmentList, QuoteCard } from '../../components/cards.jsx';
import TextField, { TextArea } from '../../components/TextField.jsx';
import {
  Button,
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
import { formatMoney, formatSlot, formatTimestamp, todayDateOnly } from '../../utils/format.js';
import { trackRequest, untrackRequest } from '../../utils/providerJobs.js';

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

function ScheduleForm({ request, busy, onSubmit }) {
  const today = todayDateOnly();
  const [form, setForm] = useState({
    scheduledDate: request.preferredDate >= today ? request.preferredDate : '',
    scheduledTime: request.preferredTime || '',
  });
  const [errors, setErrors] = useState({});

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};

    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.scheduledDate)) {
      nextErrors.scheduledDate = 'Choose a date.';
    } else if (form.scheduledDate < today) {
      nextErrors.scheduledDate = 'Date cannot be in the past.';
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.scheduledTime)) {
      nextErrors.scheduledTime = 'Choose a time.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await onSubmit(form);
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <div className="form-row">
        <TextField
          id="scheduledDate"
          label="Visit date"
          type="date"
          min={today}
          value={form.scheduledDate}
          error={errors.scheduledDate}
          onChange={(event) => {
            setForm((current) => ({ ...current, scheduledDate: event.target.value }));
            setErrors((current) => ({ ...current, scheduledDate: '' }));
          }}
        />
        <TextField
          id="scheduledTime"
          label="Visit time"
          type="time"
          value={form.scheduledTime}
          error={errors.scheduledTime}
          onChange={(event) => {
            setForm((current) => ({ ...current, scheduledTime: event.target.value }));
            setErrors((current) => ({ ...current, scheduledTime: '' }));
          }}
        />
      </div>
      <Button type="submit" block loading={busy} loadingText="Scheduling…">
        Confirm visit
      </Button>
    </form>
  );
}

function JobActions({ request, action, onSchedule, onRequestConfirm }) {
  if (request.status === 'QUOTE_ACCEPTED') {
    return (
      <Card className="card--accent">
        <h2 className="card__title">You got the job</h2>
        <p className="body-text">
          Confirm when you’ll visit. The customer asked for{' '}
          {formatSlot(request.preferredDate, request.preferredTime)}.
        </p>
        <ScheduleForm request={request} busy={action.pending === 'schedule'} onSubmit={onSchedule} />
      </Card>
    );
  }

  if (request.status === 'SCHEDULED') {
    return (
      <Card className="card--accent">
        <h2 className="card__title">Visit scheduled</h2>
        <p className="body-text">
          {formatSlot(request.scheduledDate, request.scheduledTime)}. Start the job when you arrive.
        </p>
        <Button block onClick={() => onRequestConfirm('start')} disabled={Boolean(action.pending)}>
          Start job
        </Button>
      </Card>
    );
  }

  if (request.status === 'IN_PROGRESS') {
    return (
      <Card className="card--accent">
        <h2 className="card__title">Job in progress</h2>
        <p className="body-text">Mark the job complete once the work is done.</p>
        <Button block onClick={() => onRequestConfirm('complete')} disabled={Boolean(action.pending)}>
          Mark as complete
        </Button>
      </Card>
    );
  }

  if (request.status === 'COMPLETED') {
    return (
      <Card>
        <h2 className="card__title">Job completed</h2>
        <p className="body-text">Nice work — this job is finished.</p>
      </Card>
    );
  }

  return null;
}

function ProviderRequestDetailsPage({ requestId }) {
  const { user } = useAuth();
  const data = useApi(async () => {
    const [requestResult, quotesResult] = await Promise.all([
      providerApi.getRequest(requestId),
      requestsApi.quotes(requestId),
    ]);
    return { request: requestResult.request, quotes: quotesResult.quotes };
  }, [requestId]);
  const action = useAction();
  const [confirm, setConfirm] = useState(null);
  const [success, setSuccess] = useState('');

  const request = data.data?.request;
  const isSelected = request?.selectedProviderId === user.id;

  useEffect(() => {
    if (isSelected) {
      trackRequest(user.id, requestId);
    }
  }, [isSelected, requestId, user.id]);

  useEffect(() => {
    if ([400, 403, 404].includes(data.error?.status)) {
      untrackRequest(user.id, requestId);
    }
  }, [data.error, requestId, user.id]);

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

  const quotes = data.data.quotes;
  const activeQuote = quotes.find((quote) => quote.status === 'PENDING' || quote.status === 'ACCEPTED');
  const hasRejectedQuote = quotes.some((quote) => quote.status === 'REJECTED');
  const canQuote = QUOTABLE.includes(request.status) && !activeQuote && !isSelected;
  const lostJob =
    !isSelected && Boolean(request.selectedProviderId) && request.status !== 'CANCELLED';

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

  function submitQuote(payload) {
    return perform(
      'quote',
      async () => {
        await providerApi.submitQuote(request.id, payload);
        trackRequest(user.id, request.id);
      },
      'Quote sent. The customer will review it.',
    );
  }

  function schedule(payload) {
    return perform(
      'schedule',
      () => providerApi.schedule(request.id, payload),
      'Visit scheduled. The customer can now see the date and time.',
    );
  }

  const confirmContent = {
    start: {
      title: 'Start this job?',
      message: 'The customer will see that work is in progress. This can’t be undone.',
      confirmLabel: 'Start job',
      run: () => perform('start', () => providerApi.start(request.id), 'Job started.'),
    },
    complete: {
      title: 'Mark job as complete?',
      message: 'Only do this once the work is finished. This can’t be undone.',
      confirmLabel: 'Mark complete',
      run: () => perform('complete', () => providerApi.complete(request.id), 'Job marked as complete.'),
    },
  }[confirm];

  return (
    <AppShell>
      <PageHeader
        back={back}
        title={request.service?.name || 'Service request'}
        subtitle={`Posted ${formatTimestamp(request.createdAt)}`}
        actions={<StatusBadge status={request.status} audience="provider" />}
      />

      <div className="stack">
        <Notice tone="success">{success}</Notice>
        <Notice>{action.error}</Notice>
        {data.error ? <Notice>{data.error.message}</Notice> : null}
      </div>

      <div className="detail-layout">
        <div className="detail-layout__main">
          {isSelected ? (
            <JobActions
              request={request}
              action={action}
              onSchedule={schedule}
              onRequestConfirm={setConfirm}
            />
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
              onSubmit={submitQuote}
            />
          ) : null}

          {quotes.length > 0 ? (
            <section className="section section--tight" aria-labelledby="own-quotes-heading">
              <h2 id="own-quotes-heading" className="section__title">
                Your quotes
              </h2>
              <div className="list">
                {quotes.map((quote) => (
                  <QuoteCard
                    key={quote.id}
                    quote={quote}
                    showProvider={false}
                    highlight={quote.status === 'ACCEPTED'}
                  />
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
                { label: 'Problem', value: request.description },
                {
                  label: 'Preferred time',
                  value: formatSlot(request.preferredDate, request.preferredTime),
                },
                {
                  label: 'Scheduled visit',
                  value: request.scheduledDate
                    ? formatSlot(request.scheduledDate, request.scheduledTime)
                    : '',
                },
                {
                  label: 'Your price',
                  value: isSelected && activeQuote ? formatMoney(activeQuote.amount) : '',
                },
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
