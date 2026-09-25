import AppShell from '../../components/AppShell.jsx';
import StepIndicator from '../../components/StepIndicator.jsx';
import { IssueCard } from '../../components/cards.jsx';
import { Card, ErrorState, LoadingState, Notice, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { navigate } from '../../hooks/useRoute.js';
import { servicesApi } from '../../services/fixApi.js';
import { formatCategory, formatMoney } from '../../utils/format.js';
import { buildLoginPath } from '../../utils/roles.js';
import { bookPath } from './publicLinks.js';

function ServiceDetailsPage({ serviceId }) {
  const { isAuthenticated, user } = useAuth();
  const service = useApi(() => servicesApi.get(serviceId), [serviceId]);
  const back = { to: '/services', label: 'All services' };
  const isProvider = isAuthenticated && user.role === 'PROVIDER';

  function chooseIssue(issue) {
    const target = bookPath(serviceId, issue.key);
    navigate(isAuthenticated ? target : buildLoginPath(target));
  }

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
      <StepIndicator current="issue" />
      <PageHeader back={back} title={details.name} subtitle={formatCategory(details.category)} />

      <Card>
        {details.image ? <img className="service-hero" src={details.image} alt="" /> : null}
        <p className="body-text">{details.description}</p>
        {details.startingPrice !== null ? (
          <p className="service-price">
            Starting at <strong>{formatMoney(details.startingPrice)}</strong>
            <span className="field-hint"> · you agree the final price directly with your provider</span>
          </p>
        ) : null}
      </Card>

      <section className="section section--tight" aria-labelledby="issues-heading">
        <h2 id="issues-heading" className="section__title">
          What’s wrong?
        </h2>
        {isProvider ? (
          <Notice tone="info">You are logged in as a provider. Only customers can book a service.</Notice>
        ) : (
          <>
            <p className="body-text">Pick the closest match. You can add details on the next step.</p>
            <div className="issue-grid">
              {details.issues.map((issue) => (
                <IssueCard key={issue.key} issue={issue} onSelect={chooseIssue} />
              ))}
            </div>
            {!isAuthenticated ? (
              <p className="field-hint">You’ll be asked to log in or create an account to continue.</p>
            ) : null}
          </>
        )}
      </section>
    </AppShell>
  );
}

export default ServiceDetailsPage;
