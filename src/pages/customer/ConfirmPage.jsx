import { useEffect } from 'react';
import AppShell from '../../components/AppShell.jsx';
import StepIndicator from '../../components/StepIndicator.jsx';
import { AddressBlock, Avatar, ProviderFacts, RatingSummary } from '../../components/cards.jsx';
import {
  Button,
  ButtonLink,
  Card,
  DetailList,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { navigate } from '../../hooks/useRoute.js';
import { providersApi, requestsApi } from '../../services/fixApi.js';
import { formatMoney, formatSlot } from '../../utils/format.js';

const CONFIRMABLE = ['QUOTE_ACCEPTED', 'SCHEDULED'];

function ConfirmPage({ requestId }) {
  const data = useApi(async () => {
    const { request } = await requestsApi.get(requestId);
    const provider = request.selectedProviderId
      ? (await providersApi.get(request.selectedProviderId)).provider
      : null;
    return { request, provider };
  }, [requestId]);
  const confirm = useAction();

  const bookingId = data.data?.request.booking?.id;

  // Already confirmed: the booking page is the source of truth from here on.
  useEffect(() => {
    if (bookingId) {
      navigate(`/bookings/${bookingId}`, { replace: true });
    }
  }, [bookingId]);

  const back = { to: `/requests/${requestId}`, label: 'Back' };

  if (data.loading || bookingId) {
    return (
      <AppShell width="narrow">
        <LoadingState label="Loading booking details…" />
      </AppShell>
    );
  }

  if (data.error) {
    return (
      <AppShell width="narrow">
        <PageHeader title="Confirm booking" back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AppShell>
    );
  }

  const { request, provider } = data.data;
  const quote = request.acceptedQuote;

  if (!CONFIRMABLE.includes(request.status) || !provider || !quote) {
    return (
      <AppShell width="narrow">
        <PageHeader title="Confirm booking" back={back} />
        <Notice tone="info">
          {request.status === 'CANCELLED'
            ? 'This request was cancelled, so there is nothing to confirm.'
            : 'Choose a provider first — then you can confirm the booking.'}
        </Notice>
        <ButtonLink to={`/requests/${requestId}`} variant="secondary" block>
          Back to providers
        </ButtonLink>
      </AppShell>
    );
  }

  async function handleConfirm() {
    await confirm.run('confirm', async () => {
      const result = await requestsApi.confirm(request.id);
      navigate(`/bookings/${result.booking.id}?confirmed=1`, { replace: true });
    });
  }

  return (
    <AppShell width="narrow">
      <StepIndicator current="confirm" />
      <PageHeader back={back} title="Confirm your booking" subtitle="Check the details, then confirm." />

      <Notice>{confirm.error}</Notice>

      <Card>
        <h2 className="card__title">Booking summary</h2>
        <DetailList
          items={[
            { label: 'Service', value: request.service?.name },
            { label: 'Issue', value: request.issueLabel },
            { label: 'Price', value: formatMoney(quote.amount) },
            { label: 'Includes', value: quote.description },
            {
              label: request.scheduledDate ? 'Scheduled visit' : 'Preferred time',
              value: request.scheduledDate
                ? formatSlot(request.scheduledDate, request.scheduledTime)
                : `${formatSlot(request.preferredDate, request.preferredTime)} (provider will confirm)`,
            },
          ]}
        />
        <h3 className="card__subtitle">Service address</h3>
        <AddressBlock address={request.address} />
      </Card>

      <Card>
        <h2 className="card__title">Your provider</h2>
        <div className="provider-card__head">
          <Avatar name={provider.name} image={provider.profileImage} />
          <div className="provider-card__identity">
            <span className="provider-card__name">{provider.name}</span>
            <RatingSummary rating={provider.rating} reviewCount={provider.reviewCount} />
          </div>
        </div>
        <ProviderFacts provider={provider} />
      </Card>

      <Card>
        <h2 className="card__title">Safety &amp; trust</h2>
        <ul className="safety-list">
          <li>
            <span className="safety-list__icon" aria-hidden="true">#</span>
            <span>
              <strong>Arrival code.</strong> After you confirm, you get a 4-digit code. Share it with
              the technician only when they arrive.
            </span>
          </li>
          <li>
            <span className="safety-list__icon" aria-hidden="true">₹</span>
            <span>
              <strong>Pay after the job.</strong> No payment is taken now. You pay{' '}
              {formatMoney(quote.amount)} once the service is completed.
            </span>
          </li>
          <li>
            <span className="safety-list__icon" aria-hidden="true">💬</span>
            <span>
              <strong>Stay in touch.</strong> Track the technician and chat with them in the app.
            </span>
          </li>
        </ul>
        <p className="field-hint">
          Provider identity verification and insurance are not offered on 4Fix yet.
        </p>
      </Card>

      <div className="sticky-actions">
        <Button block size="lg" loading={confirm.pending === 'confirm'} loadingText="Confirming…" onClick={handleConfirm}>
          Confirm booking
        </Button>
      </div>
    </AppShell>
  );
}

export default ConfirmPage;
