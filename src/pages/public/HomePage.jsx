import AppShell from '../../components/AppShell.jsx';
import { ServiceCard } from '../../components/cards.jsx';
import { ButtonLink, EmptyState, ErrorState, Link, LoadingState } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { servicesApi } from '../../services/fixApi.js';
import { useReportIssuePath } from './publicLinks.js';

const STEPS = [
  { title: 'Report the issue', text: 'Pick a service, describe the problem and choose a time that suits you.' },
  { title: 'Compare quotes', text: 'Service providers review your request and send you their price.' },
  { title: 'Get it fixed', text: 'Accept the quote you like and your provider schedules the visit.' },
];

function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const reportPath = useReportIssuePath();
  const services = useApi(() => servicesApi.list(), []);
  const popularServices = services.data?.services.slice(0, 6) || [];

  return (
    <AppShell>
      <section className="hero">
        <p className="hero__eyebrow">
          {isAuthenticated ? `Hi ${user.name.split(' ')[0]},` : 'Repairs, maintenance and home services'}
        </p>
        <h1 className="hero__title">Something broken? Get it fixed with 4Fix.</h1>
        <p className="hero__text">
          Tell us what needs fixing, compare quotes from service providers and book the one that
          works for you.
        </p>
        <div className="hero__actions">
          {reportPath ? (
            <ButtonLink to={reportPath} size="lg">
              Report an issue
            </ButtonLink>
          ) : null}
          <ButtonLink to="/services" variant="secondary" size="lg">
            Browse services
          </ButtonLink>
        </div>
      </section>

      <section className="section" aria-labelledby="popular-heading">
        <div className="section__header">
          <h2 id="popular-heading" className="section__title">
            Popular services
          </h2>
          <Link to="/services" className="text-link">
            See all
          </Link>
        </div>

        {services.loading ? <LoadingState label="Loading services…" /> : null}
        {services.error ? <ErrorState error={services.error} onRetry={services.reload} /> : null}
        {!services.loading && !services.error && popularServices.length === 0 ? (
          <EmptyState
            title="No services yet"
            message="Services will appear here as soon as they are available."
          />
        ) : null}
        {popularServices.length > 0 && !services.error ? (
          <div className="card-grid">
            {popularServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="section" aria-labelledby="how-heading">
        <h2 id="how-heading" className="section__title">
          How 4Fix works
        </h2>
        <ol className="steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className="step">
              <span className="step__number">{index + 1}</span>
              <div>
                <p className="step__title">{step.title}</p>
                <p className="step__text">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {!isAuthenticated ? (
        <section className="card callout">
          <div>
            <p className="callout__title">Are you a service provider?</p>
            <p className="callout__text">Find customers who need your skills and send them quotes.</p>
          </div>
          <ButtonLink to="/signup/provider" variant="secondary">
            Join as a provider
          </ButtonLink>
        </section>
      ) : null}
    </AppShell>
  );
}

export default HomePage;
