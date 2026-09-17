import AppShell from '../../components/AppShell.jsx';
import { ButtonLink, Card, ErrorState, LoadingState, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { servicesApi } from '../../services/fixApi.js';
import { formatCategory } from '../../utils/format.js';
import { useReportIssuePath } from './publicLinks.js';

function ServiceDetailsPage({ serviceId }) {
  const service = useApi(() => servicesApi.get(serviceId), [serviceId]);
  const reportPath = useReportIssuePath(serviceId);
  const back = { to: '/services', label: 'All services' };

  if (service.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState label="Loading service…" />
      </AppShell>
    );
  }

  if (service.error) {
    const isUnavailable = service.error.status === 404 || service.error.status === 400;

    return (
      <AppShell width="narrow">
        <PageHeader title="Service" back={back} />
        <ErrorState
          error={
            isUnavailable
              ? { status: 404, message: 'This service does not exist or is no longer available.' }
              : service.error
          }
          onRetry={service.reload}
        />
      </AppShell>
    );
  }

  const { service: details } = service.data;

  return (
    <AppShell width="narrow">
      <PageHeader back={back} title={details.name} subtitle={formatCategory(details.category)} />

      <Card>
        <p className="availability">
          <span className="availability__dot" aria-hidden="true" /> Available to book
        </p>
        <p className="body-text">{details.description}</p>
      </Card>

      <Card className="callout">
        <div>
          <p className="callout__title">Need help with this?</p>
          <p className="callout__text">
            Describe the problem and pick a time. Providers will send you quotes.
          </p>
        </div>
        {reportPath ? (
          <ButtonLink to={reportPath} block>
            Report an issue
          </ButtonLink>
        ) : null}
      </Card>
    </AppShell>
  );
}

export default ServiceDetailsPage;
