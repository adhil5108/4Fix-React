import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import TextField, { TextArea } from '../components/TextField.jsx';
import {
  Button,
  Card,
  DetailList,
  ErrorState,
  Link,
  LoadingState,
  Notice,
  PageHeader,
} from '../components/ui.jsx';
import { useAction, useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { navigate } from '../hooks/useRoute.js';
import { meRequest, updateMeRequest } from '../services/authApi.js';
import { servicesApi } from '../services/fixApi.js';
import { formatCategory } from '../utils/format.js';

const ROLE_LABELS = {
  CUSTOMER: 'Customer',
  PROVIDER: 'Service provider',
  ADMIN: 'Administrator',
};

function formFromUser(user) {
  return {
    name: user.name || '',
    bio: user.bio || '',
    experienceYears: user.experienceYears === null || user.experienceYears === undefined ? '' : String(user.experienceYears),
    serviceCategories: user.serviceCategories || [],
    isAvailable: user.isAvailable !== false,
  };
}

function ProfilePage() {
  const { user: authUser, logout, updateUser } = useAuth();
  const isProvider = authUser.role === 'PROVIDER';
  const me = useApi(() => meRequest(), []);
  const services = useApi(() => (isProvider ? servicesApi.list() : Promise.resolve({ services: [] })), [isProvider]);
  const save = useAction();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  const user = me.data?.user;

  useEffect(() => {
    if (user) {
      setForm(formFromUser(user));
    }
  }, [user]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setSaved(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaved(false);

    const nextErrors = {};
    const name = form.name.trim();

    if (name.length < 2) nextErrors.name = 'Name must be at least 2 characters.';
    else if (name.length > 120) nextErrors.name = 'Name must be 120 characters or fewer.';

    if (isProvider) {
      if (form.bio.trim().length > 500) nextErrors.bio = 'Bio must be 500 characters or fewer.';
      if (form.experienceYears !== '' && !/^\d{1,2}$/.test(form.experienceYears)) {
        nextErrors.experienceYears = 'Enter whole years (0–60).';
      } else if (form.experienceYears !== '' && Number(form.experienceYears) > 60) {
        nextErrors.experienceYears = 'Enter whole years (0–60).';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = { name };

    if (isProvider) {
      payload.bio = form.bio.trim() || null;
      payload.experienceYears = form.experienceYears === '' ? null : Number(form.experienceYears);
      payload.serviceCategories = form.serviceCategories;
      payload.isAvailable = form.isAvailable;
    }

    const ok = await save.run('save', async () => {
      const result = await updateMeRequest(payload);
      updateUser(result.user);
      await me.refresh();
    });

    setSaved(ok);
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (me.loading || !form) {
    if (me.error) {
      return (
        <AppShell width="narrow">
          <PageHeader title="Profile" />
          <ErrorState error={me.error} onRetry={me.reload} />
        </AppShell>
      );
    }

    return (
      <AppShell width="narrow">
        <LoadingState label="Loading profile…" />
      </AppShell>
    );
  }

  const categories = [...new Set((services.data?.services || []).map((service) => service.category))].sort();

  return (
    <AppShell width="narrow">
      <PageHeader title="Profile" subtitle={ROLE_LABELS[user.role]} />

      <Card>
        <h2 className="card__title">Your details</h2>
        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          <Notice>{save.error}</Notice>
          {saved ? <Notice tone="success">Your profile was updated.</Notice> : null}
          <TextField
            id="name"
            label="Full Name"
            autoComplete="name"
            maxLength={120}
            value={form.name}
            error={errors.name}
            onChange={(event) => update('name', event.target.value)}
          />

          {isProvider ? (
            <>
              <TextArea
                id="bio"
                label="About you"
                rows={3}
                maxLength={500}
                value={form.bio}
                error={errors.bio}
                hint="Shown to customers on your profile."
                placeholder="e.g. 8 years fixing split and window ACs across Bengaluru."
                onChange={(event) => update('bio', event.target.value)}
              />
              <TextField
                id="experienceYears"
                label="Years of experience"
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={form.experienceYears}
                error={errors.experienceYears}
                onChange={(event) => update('experienceYears', event.target.value.replace(/\D/g, ''))}
              />
              <div className="field">
                <label>Services you offer</label>
                {categories.length === 0 ? (
                  <p className="field-hint">Categories will appear once services are available.</p>
                ) : (
                  <div className="chip-row" role="group" aria-label="Service categories">
                    {categories.map((category) => {
                      const selected = form.serviceCategories.includes(category);
                      return (
                        <button
                          key={category}
                          type="button"
                          className={`chip${selected ? ' is-active' : ''}`}
                          aria-pressed={selected}
                          onClick={() =>
                            update(
                              'serviceCategories',
                              selected
                                ? form.serviceCategories.filter((item) => item !== category)
                                : [...form.serviceCategories, category],
                            )
                          }
                        >
                          {formatCategory(category)}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="field-hint">
                  Leave all unselected to be shown for every service.
                </p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(event) => update('isAvailable', event.target.checked)}
                />
                <span>
                  <strong>Available for new bookings</strong>
                  <span className="field-hint">Turn off to hide yourself from customers for a while.</span>
                </span>
              </label>
            </>
          ) : null}

          <div>
            <Button type="submit" loading={save.pending === 'save'} loadingText="Saving…">
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="card__title">Account</h2>
        <DetailList
          items={[
            { label: user.role === 'ADMIN' ? 'Username' : 'Phone number', value: user.username },
            { label: 'Account type', value: ROLE_LABELS[user.role] },
          ]}
        />
        <p className="card__links">
          {user.role === 'CUSTOMER' ? (
            <>
              <Link to="/bookings" className="text-link">
                My bookings
              </Link>
              <Link to="/requests" className="text-link">
                My requests
              </Link>
            </>
          ) : null}
          {isProvider ? (
            <>
              <Link to="/provider/jobs" className="text-link">
                My jobs
              </Link>
              <Link to={`/providers/${user.id}`} className="text-link">
                View public profile
              </Link>
            </>
          ) : null}
        </p>
      </Card>

      <Button variant="danger-ghost" block onClick={handleLogout}>
        Log out
      </Button>
    </AppShell>
  );
}

export default ProfilePage;
