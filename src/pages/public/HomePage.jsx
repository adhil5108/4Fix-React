import AppShell from '../../components/AppShell.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import { BookingCard, ServiceCard } from '../../components/cards.jsx';
import { ButtonLink, EmptyState, ErrorState, Link, LoadingState } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { navigate } from '../../hooks/useRoute.js';
import { bookingsApi, servicesApi } from '../../services/fixApi.js';
import { firstName, formatCategory } from '../../utils/format.js';

const STEPS = [
  { title: 'Tell us what’s wrong', text: 'Pick a service, choose the problem and a time that suits you.' },
  { title: 'Choose your provider', text: 'Compare providers and their quotes, then confirm your booking.' },
  { title: 'Track, chat, pay, rate', text: 'Follow the technician, chat in the app, pay after the job and leave a review.' },
];

function NextBooking() {
  const next = useApi(async () => {
    const active = await bookingsApi.list({ status: 'ACTIVE' });
    if (active.bookings.length > 0) return active.bookings[0];
    const upcoming = await bookingsApi.list({ status: 'UPCOMING' });
    return upcoming.bookings[0] || null;
  }, []);

  if (next.loading || next.error || !next.data) {
    return null;
  }

  return (
    <section className="section section--tight" aria-labelledby="next-heading">
      <div className="section__header">
        <h2 id="next-heading" className="section__title">
          Your next booking
        </h2>
        <Link to="/bookings" className="text-link">
          All bookings
        </Link>
      </div>
      <BookingCard booking={next.data} to={`/bookings/${next.data.id}`} />
    </section>
  );
}

function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const services = useApi(() => servicesApi.list(), []);
  const all = services.data?.services || [];
  const popular = all.filter((service) => service.isPopular);
  const featured = (popular.length > 0 ? popular : all).slice(0, 6);
  const categories = [...new Set(all.map((service) => service.category))].sort();
  const isCustomer = isAuthenticated && user.role === 'CUSTOMER';

  return (
    <AppShell>
      <section className="hero">
        <p className="hero__eyebrow">
          {isAuthenticated ? `Hi ${firstName(user.name)},` : 'Repairs, maintenance and home services'}
        </p>
        <h1 className="hero__title">Something broken? Get it fixed with 4Fix.</h1>
        <p className="hero__text">
          Choose a service, tell us what’s wrong, pick a provider and track the technician to
          your door.
        </p>
        <div className="hero__search">
          <SearchBar
            size="lg"
            onSearch={(query) =>
              navigate(query ? `/services?search=${encodeURIComponent(query)}` : '/services')
            }
          />
        </div>
        {categories.length > 0 ? (
          <div className="chip-row chip-row--scroll hero__categories" aria-label="Categories">
            {categories.map((category) => (
              <Link
                key={category}
                to={`/services?category=${encodeURIComponent(category)}`}
                className="chip"
              >
                {formatCategory(category)}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {isCustomer ? <NextBooking /> : null}

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
        {!services.loading && !services.error && featured.length === 0 ? (
          <EmptyState
            title="No services yet"
            message="Services will appear here as soon as they are available."
          />
        ) : null}
        {featured.length > 0 && !services.error ? (
          <div className="card-grid card-grid--popular">
            {featured.map((service) => (
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
        <div className="section__cta">
          <ButtonLink to="/services" size="lg">
            Book a service
          </ButtonLink>
        </div>
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
