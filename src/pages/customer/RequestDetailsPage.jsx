import { useState } from 'react';
import AppShell from '../../components/AppShell.jsx';
import { AddressBlock, AttachmentList, QuoteCard } from '../../components/cards.jsx';
import RequestProgress from '../../components/RequestProgress.jsx';
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
import { quotesApi, requestsApi } from '../../services/fixApi.js';
import { formatMoney, formatSlot, formatTimestamp } from '../../utils/format.js';

const CANCELLABLE = ['PENDING', 'QUOTE_RECEIVED'];
const QUOTE_ORDER = { ACCEPTED: 0, PENDING: 1, REJECTED: 2 };

function nextStepText(request) {
  switch (request.status) {
    case 'PENDING':
      return 'Your request is visible to service providers. You will see quotes here as they arrive.';
    case 'QUOTE_RECEIVED':
      return 'Compare the quotes below and accept the one that suits you.';
    case 'QUOTE_ACCEPTED':
      return `${request.selectedProvider?.name || 'Your provider'} will confirm a date and time for the visit.`;
    case 'SCHEDULED':
      return `${request.selectedProvider?.name || 'Your provider'} is booked for ${formatSlot(
        request.scheduledDate,
        request.scheduledTime,
      )}.`;
    case 'IN_PROGRESS':
      return 'Work on your request has started.';
    case 'COMPLETED':
      return 'This job is complete.';
    default:
      return '';
  }
}

function RequestDetailsPage({ requestId }) {
  const justCreated = useQueryParam('created') === '1';
  const data = useApi(async () => {
    const [requestResult, quotesResult] = await Promise.all([
      requestsApi.get(requestId),
      requestsApi.quotes(requestId),
    ]);
    return { request: requestResult.request, quotes: quotesResult.quotes };
  }, [requestId]);
  const action = useAction();
  const [dialog, setDialog] = useState(null);
  const [success, setSuccess] = useState('');

  const back = { to: '/requests', label: 'My requests' };

  if (data.loading) {
    return (
      <AppShell>
        <LoadingState label="Loading request…" />
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

  const { request, quotes } = data.data;
  const canCancel = CANCELLABLE.includes(request.status);
  const canDecideQuotes = request.status === 'QUOTE_RECEIVED';
  const sortedQuotes = [...quotes].sort(
    (left, right) => (QUOTE_ORDER[left.status] ?? 9) - (QUOTE_ORDER[right.status] ?? 9),
  );
  const pendingQuotes = quotes.filter((quote) => quote.status === 'PENDING');
  const acceptedQuote = request.acceptedQuote || quotes.find((quote) => quote.status === 'ACCEPTED');

  async function perform(key, operation, message) {
    setSuccess('');
    const ok = await action.run(key, operation);
    setDialog(null);

    if (ok) {
      setSuccess(message);
    }

    // Refresh either way so a conflict (e.g. state changed elsewhere) shows the real state.
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
        `You accepted ${dialog.quote.provider?.name || 'the provider'}’s quote. They will schedule the visit next.`,
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

  const dialogContent = {
    cancel: {
      title: 'Cancel this request?',
      message: 'Providers will no longer be able to quote. This cannot be undone.',
      confirmLabel: 'Cancel request',
      confirmVariant: 'danger',
    },
    accept: {
      title: 'Accept this quote?',
      message: dialog?.quote
        ? `${dialog.quote.provider?.name || 'This provider'} will do the job for ${formatMoney(
            dialog.quote.amount,
          )}.${pendingQuotes.length > 1 ? ' Your other pending quotes will be declined.' : ''}`
        : '',
      confirmLabel: 'Accept quote',
      confirmVariant: 'primary',
    },
    reject: {
      title: 'Decline this quote?',
      message: dialog?.quote
        ? `Decline ${dialog.quote.provider?.name || 'this provider'}’s quote of ${formatMoney(
            dialog.quote.amount,
          )}?`
        : '',
      confirmLabel: 'Decline quote',
      confirmVariant: 'danger',
    },
  }[dialog?.type] || {};

  return (
    <AppShell>
      <PageHeader
        back={back}
        title={request.service?.name || 'Service request'}
        subtitle={`Requested ${formatTimestamp(request.createdAt)}`}
        actions={<StatusBadge status={request.status} />}
      />

      <div className="stack">
        {justCreated && !success ? (
          <Notice tone="success">Request sent. We’ll show quotes here as providers respond.</Notice>
        ) : null}
        <Notice tone="success">{success}</Notice>
        <Notice>{action.error}</Notice>
        {data.error ? <Notice>{data.error.message}</Notice> : null}
      </div>

      <div className="detail-layout">
        <div className="detail-layout__main">
          <Card>
            <h2 className="card__title">Status</h2>
            <p className="body-text">{nextStepText(request)}</p>
            <RequestProgress status={request.status} />
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

          {request.selectedProvider ? (
            <Card className="card--accent">
              <h2 className="card__title">Your provider</h2>
              <DetailList
                items={[
                  { label: 'Provider', value: request.selectedProvider.name },
                  { label: 'Agreed price', value: acceptedQuote ? formatMoney(acceptedQuote.amount) : '' },
                  { label: 'Work', value: acceptedQuote?.description },
                  {
                    label: 'Visit',
                    value: request.scheduledDate
                      ? formatSlot(request.scheduledDate, request.scheduledTime)
                      : 'Waiting for the provider to schedule',
                  },
                ]}
              />
            </Card>
          ) : null}

          <section className="section section--tight" aria-labelledby="quotes-heading">
            <div className="section__header">
              <h2 id="quotes-heading" className="section__title">
                Quotes {quotes.length > 0 ? <span className="count">{quotes.length}</span> : null}
              </h2>
            </div>

            {quotes.length === 0 ? (
              <EmptyState
                title={request.status === 'CANCELLED' ? 'No quotes' : 'No quotes yet'}
                message={
                  request.status === 'PENDING'
                    ? 'Providers are reviewing your request. Check back soon.'
                    : undefined
                }
              />
            ) : (
              <div className="list">
                {sortedQuotes.map((quote) => {
                  const actionable = canDecideQuotes && quote.status === 'PENDING';

                  return (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      highlight={quote.status === 'ACCEPTED'}
                      actions={
                        actionable ? (
                          <>
                            <Button
                              variant="secondary"
                              onClick={() => setDialog({ type: 'reject', quote })}
                              disabled={Boolean(action.pending)}
                            >
                              Decline
                            </Button>
                            <Button
                              onClick={() => setDialog({ type: 'accept', quote })}
                              disabled={Boolean(action.pending)}
                            >
                              Accept quote
                            </Button>
                          </>
                        ) : null
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="detail-layout__side">
          <Card>
            <h2 className="card__title">Request details</h2>
            <DetailList
              items={[
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

          {request.status === 'COMPLETED' ? (
            <Card>
              <h2 className="card__title">Payment</h2>
              <p className="body-text">See how payment for this job will work.</p>
              <ButtonLink to={`/requests/${request.id}/payment`} variant="secondary" block>
                View payment
              </ButtonLink>
            </Card>
          ) : null}
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
