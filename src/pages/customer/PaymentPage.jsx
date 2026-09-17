import AppShell from '../../components/AppShell.jsx';
import {
  ButtonLink,
  Card,
  DetailList,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { requestsApi } from '../../services/fixApi.js';
import { formatMoney, formatSlot } from '../../utils/format.js';

function PaymentPage({ requestId }) {
  const data = useApi(() => requestsApi.get(requestId), [requestId]);
  const back = { to: `/requests/${requestId}`, label: 'Back to request' };

  if (data.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState />
      </AppShell>
    );
  }

  if (data.error) {
    return (
      <AppShell width="narrow">
        <PageHeader title="Payment" back={{ to: '/requests', label: 'My requests' }} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AppShell>
    );
  }

  const { request } = data.data;
  const isCompleted = request.status === 'COMPLETED';

  return (
    <AppShell width="narrow">
      <PageHeader back={back} title="Payment" subtitle={request.service?.name} />

      <Card>
        <div className="card__heading-row">
          <h2 className="card__title">Job summary</h2>
          <StatusBadge status={request.status} />
        </div>
        <DetailList
          items={[
            { label: 'Provider', value: request.selectedProvider?.name },
            {
              label: 'Agreed price',
              value: request.acceptedQuote ? formatMoney(request.acceptedQuote.amount) : '',
            },
            {
              label: 'Visit',
              value: request.scheduledDate
                ? formatSlot(request.scheduledDate, request.scheduledTime)
                : '',
            },
          ]}
        />
      </Card>

      <Card className="placeholder-card">
        <h2 className="card__title">
          {isCompleted ? 'Online payment is coming soon' : 'Payment isn’t due yet'}
        </h2>
        <p className="body-text">
          {isCompleted
            ? 'Paying through 4Fix isn’t available yet. Once it launches, you’ll be able to pay for this job right here.'
            : 'Payment becomes available after your provider marks the job as completed.'}
        </p>
        <p className="field-hint">No payment has been taken for this request.</p>
      </Card>

      <ButtonLink to={`/requests/${requestId}`} variant="secondary" block>
        Back to request
      </ButtonLink>
    </AppShell>
  );
}

export default PaymentPage;
