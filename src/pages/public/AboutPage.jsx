import AppShell from '../../components/AppShell.jsx';
import { ButtonLink, Card, PageHeader } from '../../components/ui.jsx';

function AboutPage() {
  return (
    <AppShell width="narrow">
      <PageHeader title="About 4Fix" subtitle="Help with repairs, maintenance and home services." />

      <Card>
        <h2 className="card__title">What we do</h2>
        <p className="body-text">
          4Fix connects people who need something fixed with service providers who can fix it.
          Customers report a problem once, receive quotes, and choose the provider they want.
        </p>
      </Card>

      <Card>
        <h2 className="card__title">For customers</h2>
        <p className="body-text">
          Browse services, report an issue with your address and preferred time, compare quotes and
          follow your request until the job is done.
        </p>
        <ButtonLink to="/services" variant="secondary">
          Browse services
        </ButtonLink>
      </Card>

      <Card>
        <h2 className="card__title">For service providers</h2>
        <p className="body-text">
          See open requests near you, send quotes, and manage the jobs you win from scheduling to
          completion.
        </p>
        <ButtonLink to="/signup/provider" variant="secondary">
          Join as a provider
        </ButtonLink>
      </Card>
    </AppShell>
  );
}

export default AboutPage;
