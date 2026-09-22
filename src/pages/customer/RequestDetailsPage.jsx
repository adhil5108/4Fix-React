import { useState } from 'react';
import AppShell from '../../components/AppShell.jsx';
import StepIndicator from '../../components/StepIndicator.jsx';
import { AddressBlock, AttachmentList, ProviderCard, QuoteCard } from '../../components/cards.jsx';
import {
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  DetailList,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  StatusBadge,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { useQueryParam } from '../../hooks/useRoute.js';
import { usePolling } from '../../hooks/usePolling.js';
import { quotesApi, requestsApi } from '../../services/fixApi.js';
import { formatMoney, formatSlot, formatTimestamp } from '../../utils/format.js';

const CANCELLABLE = ['PENDING', 'QUOTE_RECEIVED'];
const OPEN = ['PENDING', 'QUOTE_RECEIVED'];

function statusText(request) {
  switch (request.status) {
    case 'PENDING':
      return 'Your request is live. Providers are reviewing it — quotes will appear here as they come in.';
    case 'QUOTE_RECEIVED':
      return 'You have quotes. Compare providers below and accept the one you like.';
    case 'QUOTE_ACCEPTED':
      return 'Provider chosen. Review the booking details and confirm to lock it in.';
    case 'SCHEDULED':
      return `Your visit is scheduled for ${formatSlot(request.scheduledDate, request.scheduledTime)}.`;
    case 'IN_PROGRESS':
      return 'Work on your request is in progress.';
    case 'COMPLETED':
      return 'This job is complete.';
    case 'CANCELLED':
      return 'This request was cancelled.';
    default:
      return '';
  }
}

function RequestDetailsPage({ requestId }) {
  const justCreated = useQueryParam('created') === '1';
  const data = useApi(async () => {
    const requestResult = await requestsApi.get(requestId);
    const request = requestResult.request;
    const [quotesResult, providersResult] = await Promise.all([
      requestsApi.quotes(requestId),
      request.status === 'CANCELLED' ? { providers: [] } : requestsApi.providers(requestId),
    ]);
    return { request, quotes: quotesResult.quotes, providers: providersResult.providers };
  }, [requestId]);
  const action = useAction();
  const [dialog, setDialog] = useState(null);
  const [success, setSuccess] = useState('');

  const request = data.data?.request;
  usePolling(() => data.refresh(), 15000, Boolean(request) && OPEN.includes(request.status));

  const back = { to: '/bookings', label: 'My bookings' };

  if (data.loading) {
    return (
      <AppShell>
        <LoadingState label="Loading your request…" />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    return (
      <AppShell>
        <PageHeader title="Request" back={back} />
        <ErrorState
          error={
            data.error.status === 400
              ? { status: 404, message: 'This request could not be found.' }
              : data.error
          }
          onRetry={data.reload}
        />
      </AppShell>
    );
  }

  const { quotes, providers } = data.data;
  const canCancel = CANCELLABLE.includes(request.status);
  const canDecide = request.status === 'QUOTE_RECEIVED';
  const pendingQuotes = quotes.filter((quote) => quote.status === 'PENDING');
  const acceptedQuote = request.acceptedQuote || quotes.find((quote) => quote.status === 'ACCEPTED');
  const listedProviderIds = new Set(providers.map((provider) => provider.id));
  const orphanQuotes = quotes.filter((quote) => !listedProviderIds.has(quote.providerId));
  const stepCurrent = request.status === 'QUOTE_ACCEPTED' ? 'confirm' : 'provider';

  async function perform(key, operation, message) {
    setSuccess('');
    const ok = await action.run(key, operation);
    setDialog(null);

    if (ok) {
      setSuccess(message);
    }

    // Refresh either way so a conflict (state changed elsewhere) shows the real state.
    await data.refresh();
  }

  function confirmDialog() {
    if (!dialog) return;

    if (dialog.type === 'cancel') {
      perform('cancel', () => requestsApi.cancel(request.id), 'Your request was cancelled.');
    }

    if (dialog.type === 'accept') {
      perform(
        `accept-${dialog.quote.id}`,
        () => quotesApi.accept(dialog.quote.id),
        `${dialog.providerName} is now your provider. Confirm the booking to lock it in.`,
      );
    }

    if (dialog.type === 'reject') {
      perform(
        `reject-${dialog.quote.id}`,
        () => quotesApi.reject(dialog.quote.id),
        'Quote declined. Other providers can still send quotes.',
      );
    }
  }

  const dialogContent =
    {
      cancel: {
        title: 'Cancel this request?',
        message: 'Providers will no longer be able to quote. This cannot be undone.',
        confirmLabel: 'Cancel request',
        confirmVariant: 'danger',
      },
      accept: {
        title: 'Choose this provider?',
        message: dialog?.quote
          ? `${dialog.providerName} will do the job for ${formatMoney(dialog.quote.amount)}.${
              pendingQuotes.length > 1 ? ' Your other quotes will be declined.' : ''
            }`
          : '',
        confirmLabel: 'Choose provider',
        confirmVariant: 'primary',
      },
      reject: {
        title: 'Decline this quote?',
        message: dialog?.quote
          ? `Decline ${dialog.providerName}’s quote of ${formatMoney(dialog.quote.amount)}?`
          : '',
        confirmLabel: 'Decline quote',
        confirmVariant: 'danger',
      },
    }[dialog?.type] || {};

  const quoteActions = (quote, providerName) =>
    canDecide && quote?.status === 'PENDING' ? (
      <>
        <Button
          variant="secondary"
          onClick={() => setDialog({ type: 'reject', quote, providerName })}
          disabled={Boolean(action.pending)}
        >
          Decline
        </Button>
        <Button
          onClick={() => setDialog({ type: 'accept', quote, providerName })}
          disabled={Boolean(action.pending)}
        >
          Choose · {formatMoney(quote.amount)}
        </Button>
      </>
    ) : null;

  return (
    <AppShell>
      {request.status !== 'CANCELLED' && !request.booking ? <StepIndicator current={stepCurrent} /> : null}
      <PageHeader
        back={back}
        title={request.status === 'QUOTE_ACCEPTED' ? 'Provider chosen' : 'Choose a provider'}
        subtitle={`${request.service?.name || 'Service'}${request.issueLabel ? ` · ${request.issueLabel}` : ''} · requested ${formatTimestamp(request.createdAt)}`}
        actions={<StatusBadge status={request.status} />}
      />

      <div className="stack">
        {justCreated && !success ? (
          <Notice tone="success">Request sent. Providers can now see it and send you quotes.</Notice>
        ) : null}
        <Notice tone="success">{success}</Notice>
        <Notice>{action.error}</Notice>
        {data.error ? <Notice>{data.error.message}</Notice> : null}
      </div>

      <div className="detail-layout">
        <div className="detail-layout__main">
          <Card className={request.status === 'QUOTE_ACCEPTED' && !request.booking ? 'card--accent' : ''}>
            <h2 className="card__title">What happens next</h2>
            <p className="body-text">{statusText(request)}</p>
            {request.booking ? (
              <ButtonLink to={`/bookings/${request.booking.id}`} block>
                Open your booking
              </ButtonLink>
            ) : request.status === 'QUOTE_ACCEPTED' ? (
              <ButtonLink to={`/requests/${request.id}/confirm`} block size="lg">
                Review &amp; confirm booking
              </ButtonLink>
            ) : null}
            {canCancel ? (
              <div className="card__actions">
                <Button
                  variant="danger-ghost"
                  onClick={() => setDialog({ type: 'cancel' })}
                  disabled={Boolean(action.pending)}
                >
                  Cancel request
                </Button>
              </div>
            ) : null}
          </Card>

          {request.selectedProvider && acceptedQuote ? (
            <Card>
              <h2 className="card__title">Your provider</h2>
              <DetailList
                items={[
                  { label: 'Provider', value: request.selectedProvider.name },
                  { label: 'Agreed price', value: formatMoney(acceptedQuote.amount) },
                  { label: 'Work', value: acceptedQuote.description },
                ]}
              />
            </Card>
          ) : null}

          {request.status !== 'CANCELLED' ? (
            <section className="section section--tight" aria-labelledby="providers-heading">
              <div className="section__header">
                <h2 id="providers-heading" className="section__title">
                  {request.selectedProvider ? 'Providers' : 'Available providers'}
                  {providers.length > 0 ? <span className="count">{providers.length}</span> : null}
                </h2>
              </div>

              {providers.length === 0 && orphanQuotes.length === 0 ? (
                <EmptyState
                  title="No providers are available right now"
                  message="Your request stays open. We’ll show providers here as soon as one is available — check back in a while."
                  action={<ButtonLink to="/bookings" variant="secondary">Back to bookings</ButtonLink>}
                />
              ) : (
                <div className="list">
                  {providers.map((provider) => (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                      actions={quoteActions(provider.quote, provider.name)}
                    >
                      {provider.quote ? (
                        <div className="provider-card__quote">
                          <span className="provider-card__price">{formatMoney(provider.quote.amount)}</span>
                          <span className="provider-card__quote-text">{provider.quote.description}</span>
                          {provider.quote.status !== 'PENDING' ? (
                            <StatusBadge status={provider.quote.status} audience="quote" />
                          ) : null}
                        </div>
                      ) : OPEN.includes(request.status) ? (
                        <p className="provider-card__waiting">Hasn’t quoted yet</p>
                      ) : null}
                    </ProviderCard>
                  ))}
                  {orphanQuotes.map((quote) => (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      highlight={quote.status === 'ACCEPTED'}
                      actions={quoteActions(quote, quote.provider?.name || 'This provider')}
                    />
                  ))}
                </div>
              )}
              {OPEN.includes(request.status) ? (
                <p className="field-hint" style={{ marginTop: 10 }}>
                  This page refreshes automatically while quotes come in.
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="detail-layout__side">
          <Card>
            <h2 className="card__title">Your request</h2>
            <DetailList
              items={[
                { label: 'Service', value: request.service?.name },
                { label: 'Issue', value: request.issueLabel },
                { label: 'Details', value: request.description },
                { label: 'Preferred time', value: formatSlot(request.preferredDate, request.preferredTime) },
                {
                  label: 'Scheduled visit',
                  value: request.scheduledDate ? formatSlot(request.scheduledDate, request.scheduledTime) : '',
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
        open={Boolean(dialog)}
        {...dialogContent}
        busy={Boolean(action.pending)}
        onConfirm={confirmDialog}
        onCancel={() => setDialog(null)}
      />
    </AppShell>
  );
}

export default RequestDetailsPage;
