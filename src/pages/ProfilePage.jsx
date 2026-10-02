import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../components/AppShell.jsx';
import CategoryPicker from '../components/CategoryPicker.jsx';
import { LocationPreview } from '../components/LocationCapture.jsx';
import ShopLocationField from '../components/ShopLocationField.jsx';
import TextField, { TextArea } from '../components/TextField.jsx';
import { Avatar } from '../components/cards.jsx';
import { Button, ErrorState, Link, LoadingState, Notice, PageHeader } from '../components/ui.jsx';
import { useAction, useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { navigate } from '../hooks/useRoute.js';
import { meRequest, updateMeRequest } from '../services/authApi.js';
import { categoriesApi } from '../services/fixApi.js';

function formFromUser(user) {
  return {
    name: user.name || '',
    bio: user.bio || '',
    experienceYears: user.experienceYears === null || user.experienceYears === undefined ? '' : String(user.experienceYears),
    isAvailable: user.isAvailable !== false,
  };
}

// A titled group of rows — the profile is a settings-style list, not a stack of cards.
function Section({ title, action, children }) {
  return (
    <section className="profile-section">
      <div className="profile-section__bar">
        <h2 className="profile-section__title">{title}</h2>
        {action}
      </div>
      <div className="settings-group">{children}</div>
    </section>
  );
}

function InfoRow({ icon, label, value, muted = false }) {
  return (
    <div className="settings-row">
      {icon ? (
        <span className="settings-row__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className="settings-row__text">
        <span className="settings-row__label">{label}</span>
        <span className={`settings-row__value${muted ? ' is-muted' : ''}`}>{value}</span>
      </div>
    </div>
  );
}

function LinkRow({ icon, to, children, tone }) {
  return (
    <Link to={to} className={`settings-row settings-row--link${tone ? ` settings-row--${tone}` : ''}`}>
      <span className="settings-row__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="settings-row__text settings-row__title">{children}</span>
      <span className="settings-row__chevron" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}

// The provider's registered shop/business location — fixed profile data, not a live
// position. Shown to the provider and admin only; never on the public profile. The
// editing flow (device location or typed coordinates) is unchanged.
function BusinessSection({ user, onSaved }) {
  const { t } = useTranslation();
  const current = user.shopLocation;
  const hasCoordinates = Number.isFinite(current?.latitude) && Number.isFinite(current?.longitude);
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
    <Section
      title={t('profile.sections.business')}
      action={
        current && !editing ? (
          <button type="button" className="profile-section__action" onClick={() => setEditing(true)}>
            {t('profile.edit')}
          </button>
        ) : null
      }
    >
      {current && !editing ? (
        <>
          <InfoRow icon="🏪" label={t('profile.shop.addressLabel')} value={current.address || t('profile.shop.noAddress')} muted={!current.address} />
          <InfoRow
            icon="📍"
            label={t('profile.shop.statusLabel')}
            value={
              <span className={`badge badge--${hasCoordinates ? 'success' : 'muted'}`}>
                {hasCoordinates ? t('profile.shop.pinSet') : t('profile.shop.pinMissing')}
              </span>
            }
          />
          {/* Providers who registered with an address only have no coordinates yet. */}
          {hasCoordinates ? (
            <div className="settings-row settings-row--block">
              <LocationPreview latitude={current.latitude} longitude={current.longitude} title={t('profile.shop.title')} />
            </div>
          ) : null}
        </>
      ) : (
        <div className="settings-row settings-row--block">
          <div className="form-stack">
            <p className="field-hint">{t('profile.shop.hint')}</p>
            {!current ? <Notice tone="info">{t('profile.shop.missing')}</Notice> : null}
            <Notice>{save.error}</Notice>
            <ShopLocationField
              value={value}
              error={error ? t(error) : ''}
              disabled={save.pending === 'shop'}
              onChange={(next) => {
                setValue(next);
                setError('');
              }}
            />
            <div className="profile-buttons">
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
        </div>
      )}
    </Section>
  );
}

// The categories a provider works in decide which requests they see and can accept.
// Providers registered before categories existed start with none, so the section
// opens ready to choose.
function WorkCategoriesSection({ user, onSaved }) {
  const { t } = useTranslation();
  const held = user.categories || [];
  const [editing, setEditing] = useState(held.length === 0);
  const [value, setValue] = useState(held.map((category) => category.id));
  const [error, setError] = useState('');
  const options = useApi(() => categoriesApi.list(), []);
  const save = useAction();

  // Active categories, plus any the provider still holds that admin has since disabled.
  const active = options.data?.categories || [];
  const choices = [
    ...active,
    ...held.filter((category) => category.name && !active.some((item) => item.id === category.id)),
  ];

  function startEditing() {
    setValue(held.map((category) => category.id));
    setError('');
    setEditing(true);
  }

  async function handleSave() {
    if (value.length === 0) {
      setError('auth.errors.categoriesRequired');
      return;
    }

    const ok = await save.run('categories', async () => {
      const result = await updateMeRequest({ categories: value });
      await onSaved(result.user);
    });

    if (ok) setEditing(false);
  }

  return (
    <Section
      title={t('profile.categories.title')}
      action={
        !editing ? (
          <button type="button" className="profile-section__action" onClick={startEditing}>
            {t('profile.edit')}
          </button>
        ) : null
      }
    >
      {!editing ? (
        <div className="settings-row settings-row--block">
          <div className="chip-row chip-row--static">
            {held.map((category) => (
              <span key={category.id} className="chip">
                {category.name}
              </span>
            ))}
          </div>
          <p className="field-hint">{t('profile.categories.hint')}</p>
        </div>
      ) : (
        <div className="settings-row settings-row--block">
          <div className="form-stack">
            {held.length === 0 ? <Notice tone="info">{t('profile.categories.missing')}</Notice> : null}
            <Notice>{save.error}</Notice>
            {options.loading ? <LoadingState label={t('profile.categories.loading')} /> : null}
            {options.error ? <ErrorState error={options.error} onRetry={options.reload} /> : null}
            {options.data ? (
              <CategoryPicker
                categories={choices}
                value={value}
                disabled={save.pending === 'categories'}
                error={error ? t(error) : ''}
                onChange={(next) => {
                  setValue(next);
                  setError('');
                }}
              />
            ) : null}
            <div className="profile-buttons">
              <Button
                onClick={handleSave}
                loading={save.pending === 'categories'}
                loadingText={t('profile.details.saving')}
              >
                {t('profile.categories.save')}
              </Button>
              {held.length > 0 ? (
                <Button variant="secondary" onClick={() => setEditing(false)} disabled={save.pending === 'categories'}>
                  {t('profile.shop.cancel')}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

function ProfilePage() {
  const { t } = useTranslation();
  const { user: authUser, logout, updateUser } = useAuth();
  const isProvider = authUser.role === 'PROVIDER';
  const me = useApi(() => meRequest(), []);
  const save = useAction();
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
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

  function startEditing() {
    setForm(formFromUser(user));
    setErrors({});
    setSaved(false);
    setEditing(true);
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
      payload.isAvailable = form.isAvailable;
    }

    const ok = await save.run('save', async () => {
      const result = await updateMeRequest(payload);
      updateUser(result.user);
      await me.refresh();
    });

    setSaved(ok);
    if (ok) setEditing(false);
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

  return (
    <AppShell width="narrow">
      <h1 className="sr-only">{t('profile.title')}</h1>

      {/* Who you are, at a glance. */}
      <header className="profile-hero">
        <Avatar name={user.name} image={user.profileImage} size="lg" />
        <div className="profile-hero__text">
          <p className="profile-hero__name">{user.name}</p>
          <p className="profile-hero__phone">{user.username}</p>
          <div className="profile-hero__tags">
            <span className="badge badge--info">{t(`profile.roles.${user.role}`)}</span>
            {isProvider ? (
              <span className={`badge badge--${user.isAvailable !== false ? 'success' : 'muted'}`}>
                {user.isAvailable !== false ? t('profile.availableBadge') : t('profile.unavailableBadge')}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {saved ? <Notice tone="success">{t('profile.details.saved')}</Notice> : null}

      <Section
        title={t('profile.sections.details')}
        action={
          editing ? null : (
            <button type="button" className="profile-section__action" onClick={startEditing}>
              {t('profile.edit')}
            </button>
          )
        }
      >
        {editing ? (
          <form className="settings-row settings-row--block form-stack" onSubmit={handleSubmit} noValidate>
            <Notice>{save.error}</Notice>
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

            <div className="profile-buttons">
              <Button type="submit" loading={save.pending === 'save'} loadingText={t('profile.details.saving')}>
                {t('profile.details.save')}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={save.pending === 'save'}>
                {t('profile.shop.cancel')}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <InfoRow icon="👤" label={t('profile.details.fullName')} value={user.name} />
            <InfoRow
              icon="📞"
              label={user.role === 'ADMIN' ? t('profile.account.username') : t('profile.account.phone')}
              value={user.username}
            />
            {isProvider ? (
              <>
                <InfoRow icon="📝" label={t('profile.provider.bio')} value={user.bio || t('profile.notSet')} muted={!user.bio} />
                <InfoRow
                  icon="⏳"
                  label={t('profile.provider.experience')}
                  value={
                    user.experienceYears === null || user.experienceYears === undefined
                      ? t('profile.notSet')
                      : t('profile.years', { count: user.experienceYears })
                  }
                  muted={user.experienceYears === null || user.experienceYears === undefined}
                />
              </>
            ) : null}
          </>
        )}
      </Section>

      {isProvider ? (
        <WorkCategoriesSection
          key={(user.categories || []).map((category) => category.id).join(',')}
          user={user}
          onSaved={async (updated) => {
            updateUser(updated);
            await me.refresh();
          }}
        />
      ) : null}

      {isProvider ? (
        <BusinessSection
          user={user}
          onSaved={async (updated) => {
            updateUser(updated);
            await me.refresh();
          }}
        />
      ) : null}

      {isProvider ? (
        <Section title={t('profile.sections.quickActions')}>
          <LinkRow icon="🧾" to="/provider/requests">
            {t('profile.actions.requests')}
          </LinkRow>
          <LinkRow icon="🛠️" to="/provider/jobs">
            {t('common.nav.myJobs')}
          </LinkRow>
          <LinkRow icon="👁️" to={`/providers/${user.id}`}>
            {t('profile.account.viewPublic')}
          </LinkRow>
        </Section>
      ) : null}

      <Section title={t('profile.account.title')}>
        <InfoRow icon="🪪" label={t('profile.account.type')} value={t(`profile.roles.${user.role}`)} />
        <button type="button" className="settings-row settings-row--link settings-row--danger" onClick={handleLogout}>
          <span className="settings-row__icon" aria-hidden="true">
            ⎋
          </span>
          <span className="settings-row__text settings-row__title">{t('common.nav.logOut')}</span>
        </button>
      </Section>
    </AppShell>
  );
}

export default ProfilePage;
