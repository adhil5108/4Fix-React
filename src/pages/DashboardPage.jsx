import { useAuth } from '../hooks/useAuth.jsx';
import { navigate } from '../hooks/useRoute.js';

const dashboardCopy = {
  CUSTOMER: {
    title: 'Customer home',
    body: 'Your customer account is ready. Service features will be added next.',
  },
  PROVIDER: {
    title: 'Provider dashboard',
    body: 'Your provider account is ready. Provider tools will be added next.',
  },
  ADMIN: {
    title: 'Admin dashboard',
    body: 'Your admin account is ready. Admin tools will be added next.',
  },
};

function DashboardPage({ role }) {
  const { user, logout } = useAuth();
  const copy = dashboardCopy[role];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <main className="app-page">
      <section className="app-panel" aria-labelledby="dashboard-heading">
        <div>
          <p className="brand-name">4Fix</p>
          <h1 id="dashboard-heading">{copy.title}</h1>
          <p className="auth-lede">{copy.body}</p>
        </div>

        <dl className="account-summary">
          <div>
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Account type</dt>
            <dd>{role.toLowerCase()}</dd>
          </div>
          <div>
            <dt>Username</dt>
            <dd>{user.username}</dd>
          </div>
        </dl>

        <button type="button" className="secondary-button" onClick={handleLogout}>
          Log out
        </button>
      </section>
    </main>
  );
}

export default DashboardPage;
