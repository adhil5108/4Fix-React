import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import TextField from '../components/TextField.jsx';
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

const ROLE_LABELS = {
  CUSTOMER: 'Customer',
  PROVIDER: 'Service provider',
  ADMIN: 'Administrator',
};

function ProfilePage() {
  const { logout, updateUser } = useAuth();
  const me = useApi(() => meRequest(), []);
  const save = useAction();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [saved, setSaved] = useState(false);

  const user = me.data?.user;

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaved(false);

    const trimmed = name.trim();

    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters.');
      return;
    }

    if (trimmed.length > 120) {
      setNameError('Name must be 120 characters or fewer.');
      return;
    }

    const ok = await save.run('save', async () => {
      const result = await updateMeRequest({ name: trimmed });
      updateUser(result.user);
      await me.refresh();
    });

    setSaved(ok);
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (me.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState label="Loading profile…" />
      </AppShell>
    );
  }

  if (me.error || !user) {
    return (
      <AppShell width="narrow">
        <PageHeader title="Profile" />
        <ErrorState error={me.error} onRetry={me.reload} />
      </AppShell>
    );
  }

  const isUnchanged = name.trim() === user.name;

  return (
    <AppShell width="narrow">
      <PageHeader title="Profile" subtitle={ROLE_LABELS[user.role]} />

      <Card>
        <h2 className="card__title">Your details</h2>
        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          <Notice>{save.error}</Notice>
          {saved ? <Notice tone="success">Your name was updated.</Notice> : null}
          <TextField
            id="name"
            label="Full Name"
            autoComplete="name"
            maxLength={120}
            value={name}
            error={nameError}
            onChange={(event) => {
              setName(event.target.value);
              setNameError('');
              setSaved(false);
            }}
          />
          <div>
            <Button
              type="submit"
              loading={save.pending === 'save'}
              loadingText="Saving…"
              disabled={isUnchanged}
            >
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
        {user.role === 'CUSTOMER' ? (
          <p className="card__links">
            <Link to="/requests" className="text-link">
              My requests
            </Link>
            <Link to="/history" className="text-link">
              History
            </Link>
          </p>
        ) : null}
      </Card>

      <Button variant="danger-ghost" block onClick={handleLogout}>
        Log out
      </Button>
    </AppShell>
  );
}

export default ProfilePage;
