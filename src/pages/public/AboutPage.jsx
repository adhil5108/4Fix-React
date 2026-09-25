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
          Customers report a problem once and a nearby provider accepts the job.
        </p>
      </Card>

      <Card>
        <h2 className="card__title">For customers</h2>
        <p className="body-text">
          Pick a service, describe the problem, add photos or a voice note, share your location and
          follow your request until the job is done.
        </p>
        <ButtonLink to="/services" variant="secondary">
          Browse services
        </ButtonLink>
      </Card>

      <Card>
        <h2 className="card__title">For service providers</h2>
        <p className="body-text">
          See open requests near you, accept the jobs you want, navigate to the customer and manage
          each job from scheduling to completion.
        </p>
        <ButtonLink to="/signup/provider" variant="secondary">
          Join as a provider
        </ButtonLink>
      </Card>
    </AppShell>
  );
}

export default AboutPage;
