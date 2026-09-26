import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../components/AppShell.jsx';
import { LocationPreview } from '../components/LocationCapture.jsx';
import ShopLocationField from '../components/ShopLocationField.jsx';
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

function formFromUser(user) {
  return {
    name: user.name || '',
    bio: user.bio || '',
    experienceYears: user.experienceYears === null || user.experienceYears === undefined ? '' : String(user.experienceYears),
    serviceCategories: user.serviceCategories || [],
    isAvailable: user.isAvailable !== false,
  };
}

// The provider's registered shop/business location — fixed profile data, not a live
// position. Shown to the provider and admin only; never on the public profile.
function ShopLocationCard({ user, onSaved }) {
  const { t } = useTranslation();
  const current = user.shopLocation;
  const [editing, setEditing] = useState(!current);
  const [value, setValue] = useState(null);
  const [error, setError] = useState('');
  const save = useAction();

  async function handleSave() {
    if (!value) {
      setError('auth.errors.shopLocationRequired');
      return;
    }

    const ok = await save.run('shop', async () => {
      const result = await updateMeRequest({
        shopLocation: {
          latitude: value.latitude,
          longitude: value.longitude,
          address: value.address?.trim() || undefined,
        },
      });
      await onSaved(result.user);
    });

    if (ok) {
      setEditing(false);
      setValue(null);
    }
  }

  return (
    <Card>
      <h2 className="card__title">{t('profile.shop.title')}</h2>
      <p className="field-hint">{t('profile.shop.hint')}</p>
      {!current ? <Notice tone="info">{t('profile.shop.missing')}</Notice> : null}
      <Notice>{save.error}</Notice>

      {current && !editing ? (
        <div className="form-stack">
          <LocationPreview latitude={current.latitude} longitude={current.longitude} title={t('profile.shop.title')} />
          {current.address ? <p className="body-text">{current.address}</p> : null}
          <div>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              {t('profile.shop.change')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="form-stack">
          <ShopLocationField
            value={value}
            error={error ? t(error) : ''}
            disabled={save.pending === 'shop'}
            onChange={(next) => {
              setValue(next);
              setError('');
            }}
          />
          <div className="card__actions">
            <Button onClick={handleSave} loading={save.pending === 'shop'} loadingText={t('profile.details.saving')}>
              {t('profile.shop.save')}
            </Button>
            {current ? (
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={save.pending === 'shop'}>
                {t('profile.shop.cancel')}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );
}

function ProfilePage() {
  const { t } = useTranslation();
  const { user: authUser, logout, updateUser } = useAuth();
  const isProvider = authUser.role === 'PROVIDER';
  const me = useApi(() => meRequest(), []);
  const services = useApi(() => (isProvider ? servicesApi.list() : Promise.resolve({ services: [] })), [isProvider]);
  const save = useAction();
  const [form, setForm] = useState(null);
  // Field errors hold translation keys so they follow a language switch.
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

    if (name.length < 2) nextErrors.name = 'profile.errors.nameTooShort';
    else if (name.length > 120) nextErrors.name = 'profile.errors.nameTooLong';

    if (isProvider) {
      if (form.bio.trim().length > 500) nextErrors.bio = 'profile.errors.bioTooLong';
      if (form.experienceYears !== '' && !/^\d{1,2}$/.test(form.experienceYears)) {
        nextErrors.experienceYears = 'profile.errors.experienceInvalid';
      } else if (form.experienceYears !== '' && Number(form.experienceYears) > 60) {
        nextErrors.experienceYears = 'profile.errors.experienceInvalid';
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
          <PageHeader title={t('profile.title')} />
          <ErrorState error={me.error} onRetry={me.reload} />
        </AppShell>
      );
    }

    return (
      <AppShell width="narrow">
        <LoadingState label={t('profile.loading')} />
      </AppShell>
    );
  }

  const categories = [...new Set((services.data?.services || []).map((service) => service.category))].sort();

  return (
    <AppShell width="narrow">
      <PageHeader title={t('profile.title')} subtitle={t(`profile.roles.${user.role}`)} />

      <Card>
        <h2 className="card__title">{t('profile.details.title')}</h2>
        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          <Notice>{save.error}</Notice>
          {saved ? <Notice tone="success">{t('profile.details.saved')}</Notice> : null}
          <TextField
            id="name"
            label={t('profile.details.fullName')}
            autoComplete="name"
            maxLength={120}
            value={form.name}
            error={errors.name ? t(errors.name) : ''}
            onChange={(event) => update('name', event.target.value)}
          />

          {isProvider ? (
            <>
              <TextArea
                id="bio"
                label={t('profile.provider.bio')}
                rows={3}
                maxLength={500}
                value={form.bio}
                error={errors.bio ? t(errors.bio) : ''}
                hint={t('profile.provider.bioHint')}
                placeholder={t('profile.provider.bioPlaceholder')}
                onChange={(event) => update('bio', event.target.value)}
              />
              <TextField
                id="experienceYears"
                label={t('profile.provider.experience')}
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={form.experienceYears}
                error={errors.experienceYears ? t(errors.experienceYears) : ''}
                onChange={(event) => update('experienceYears', event.target.value.replace(/\D/g, ''))}
              />
              <div className="field">
                <label>{t('profile.provider.categories')}</label>
                {categories.length === 0 ? (
                  <p className="field-hint">{t('profile.provider.noCategories')}</p>
                ) : (
                  <div className="chip-row" role="group" aria-label={t('profile.provider.categoriesLabel')}>
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
                <p className="field-hint">{t('profile.provider.categoriesHint')}</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(event) => update('isAvailable', event.target.checked)}
                />
                <span>
                  <strong>{t('profile.provider.available')}</strong>
                  <span className="field-hint">{t('profile.provider.availableHint')}</span>
                </span>
              </label>
            </>
          ) : null}

          <div>
            <Button type="submit" loading={save.pending === 'save'} loadingText={t('profile.details.saving')}>
              {t('profile.details.save')}
            </Button>
          </div>
        </form>
      </Card>

      {isProvider ? (
        <ShopLocationCard
          user={user}
          onSaved={async (updated) => {
            updateUser(updated);
            await me.refresh();
          }}
        />
      ) : null}

      <Card>
        <h2 className="card__title">{t('profile.account.title')}</h2>
        <DetailList
          items={[
            {
              label: user.role === 'ADMIN' ? t('profile.account.username') : t('profile.account.phone'),
              value: user.username,
            },
            { label: t('profile.account.type'), value: t(`profile.roles.${user.role}`) },
          ]}
        />
        <p className="card__links">
          {isProvider ? (
            <>
              <Link to="/provider/jobs" className="text-link">
                {t('common.nav.myJobs')}
              </Link>
              <Link to={`/providers/${user.id}`} className="text-link">
                {t('profile.account.viewPublic')}
              </Link>
            </>
          ) : null}
        </p>
      </Card>

      <Button variant="danger-ghost" block onClick={handleLogout}>
        {t('common.nav.logOut')}
      </Button>
    </AppShell>
  );
}

export default ProfilePage;
