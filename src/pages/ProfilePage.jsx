import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  Hourglass,
  IdCard,
  Languages,
  LogOut,
  MapPin,
  NotebookText,
  Phone,
  Star,
  Store,
  User,
  Wrench,
} from 'lucide-react';
import AppShell from '../components/AppShell.jsx';
import CategoryPicker from '../components/CategoryPicker.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import ShopDetailsFields, { validateShopDetails } from '../components/ShopDetailsFields.jsx';
import TextField, { TextArea } from '../components/TextField.jsx';
import { Avatar } from '../components/cards.jsx';
import { Button, ErrorState, ListRow, LoadingState, Notice } from '../components/ui.jsx';
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

// A titled group of rows with an optional "Edit" action — the profile is a settings list.
function Section({ title, action, children }) {
  return (
    <section className="profile-section">
      <div className="profile-section__bar">
        <h2 className="list-group__title">{title}</h2>
        {action}
      </div>
      <div className="list-group">{children}</div>
    </section>
  );
}

function EditAction({ onClick }) {
  const { t } = useTranslation();

  return (
    <button type="button" className="link" onClick={onClick}>
      {t('profile.edit')}
    </button>
  );
}

// The provider's shop/business name and address — fixed profile data typed by the
// provider, never a map pin or a live position. Shown to the provider and admin only;
// never on the public profile. Providers registered before the name was a separate
// field keep their combined text as the address and may add a name here.
function shopForm(user) {
  return { shopName: user.shopName || '', address: user.shopLocation?.address || '' };
}

function BusinessSection({ user, onSaved }) {
  const { t } = useTranslation();
  const current = user.shopLocation?.address ? user.shopLocation : null;
  const [editing, setEditing] = useState(!current);
  const [value, setValue] = useState(() => shopForm(user));
  // Translation keys, so errors follow a language switch.
  const [errors, setErrors] = useState({});
  const save = useAction();

  function startEditing() {
    setValue(shopForm(user));
    setErrors({});
    setEditing(true);
  }

  async function handleSave() {
    const nextErrors = validateShopDetails(value, { requireName: false });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const ok = await save.run('shop', async () => {
      const result = await updateMeRequest({
        shopName: value.shopName.trim() || null,
        shopLocation: { address: value.address.trim() },
      });
      await onSaved(result.user);
    });

    if (ok) setEditing(false);
  }

  return (
    <Section
      title={t('profile.sections.business')}
      action={current && !editing ? <EditAction onClick={startEditing} /> : null}
    >
      {current && !editing ? (
        <>
          {!user.shopName ? (
            <div className="list-block">
              <Notice tone="info">{t('profile.shop.missingName')}</Notice>
            </div>
          ) : null}
          <ListRow
            icon={Store}
            label={t('profile.shop.nameLabel')}
            value={user.shopName || t('profile.shop.noName')}
            muted={!user.shopName}
          />
          <ListRow icon={MapPin} label={t('profile.shop.addressLabel')} value={current.address} />
        </>
      ) : (
        <div className="list-block form-stack">
          <p className="field-hint">{t('profile.shop.hint')}</p>
          {!current ? <Notice tone="info">{t('profile.shop.missing')}</Notice> : null}
          <Notice>{save.error}</Notice>
          <ShopDetailsFields
            value={value}
            errors={{
              shopName: errors.shopName ? t(errors.shopName) : '',
              shopAddress: errors.shopAddress ? t(errors.shopAddress) : '',
            }}
            disabled={save.pending === 'shop'}
            onChange={(field, text) => {
              setValue((form) => ({ ...form, [field]: text }));
              setErrors((form) => ({ ...form, [field === 'address' ? 'shopAddress' : 'shopName']: '' }));
            }}
          />
          <div className="button-row">
            {current ? (
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={save.pending === 'shop'}>
                {t('profile.shop.cancel')}
              </Button>
            ) : null}
            <Button onClick={handleSave} loading={save.pending === 'shop'} loadingText={t('profile.details.saving')}>
              {t('profile.shop.save')}
            </Button>
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
    <Section title={t('profile.categories.title')} action={!editing ? <EditAction onClick={startEditing} /> : null}>
      {!editing ? (
        <div className="list-block stack">
          <div className="chip-row chip-row--wrap">
            {held.map((category) => (
              <span key={category.id} className="chip chip--static">
                {category.name}
              </span>
            ))}
          </div>
          <p className="field-hint">{t('profile.categories.hint')}</p>
        </div>
      ) : (
        <div className="list-block form-stack">
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
          <div className="button-row">
            {held.length > 0 ? (
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={save.pending === 'categories'}>
                {t('profile.shop.cancel')}
              </Button>
            ) : null}
            <Button onClick={handleSave} loading={save.pending === 'categories'} loadingText={t('profile.details.saving')}>
              {t('profile.categories.save')}
            </Button>
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

  async function handleSaved(updated) {
    updateUser(updated);
    await me.refresh();
  }

  if (me.loading || !form) {
    return (
      <AppShell title={t('profile.title')} large>
        {me.error ? <ErrorState error={me.error} onRetry={me.reload} /> : <LoadingState label={t('profile.loading')} />}
      </AppShell>
    );
  }

  const available = user.isAvailable !== false;

  return (
    <AppShell title={t('profile.title')} large>
      <header className="profile-hero">
        <Avatar name={user.name} image={user.profileImage} size="lg" />
        <div className="profile-hero__text">
          <p className="profile-hero__name">{user.name}</p>
          <p className="profile-hero__phone">{user.username}</p>
          <div className="row">
            {isProvider ? (
              <span className={`badge ${available ? 'badge--done' : 'badge--muted'}`}>
                {available ? t('profile.availableBadge') : t('profile.unavailableBadge')}
              </span>
            ) : (
              <span className="badge badge--assigned">{t(`profile.roles.${user.role}`)}</span>
            )}
          </div>
        </div>
      </header>

      {saved ? <Notice tone="success">{t('profile.details.saved')}</Notice> : null}

      <Section title={t('profile.sections.details')} action={editing ? null : <EditAction onClick={startEditing} />}>
        {editing ? (
          <form className="list-block form-stack" onSubmit={handleSubmit} noValidate>
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

            <div className="button-row">
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={save.pending === 'save'}>
                {t('profile.shop.cancel')}
              </Button>
              <Button type="submit" loading={save.pending === 'save'} loadingText={t('profile.details.saving')}>
                {t('profile.details.save')}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <ListRow icon={User} label={t('profile.details.fullName')} value={user.name} />
            <ListRow
              icon={Phone}
              label={user.role === 'ADMIN' ? t('profile.account.username') : t('profile.account.phone')}
              value={user.username}
            />
            {isProvider ? (
              <>
                <ListRow icon={NotebookText} label={t('profile.provider.bio')} value={user.bio || t('profile.notSet')} muted={!user.bio} />
                <ListRow
                  icon={Hourglass}
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
          onSaved={handleSaved}
        />
      ) : null}

      {isProvider ? <BusinessSection user={user} onSaved={handleSaved} /> : null}

      <Section title={t('profile.sections.app')}>
        <ListRow icon={Languages} title={t('common.language.label')} trailing={<LanguageSwitcher />} />
        {isProvider ? (
          <>
            <ListRow icon={Wrench} to="/provider/jobs" title={t('common.nav.myJobs')} />
            <ListRow icon={Star} to="/provider/reviews" title={t('provider.reviews.title')} />
            <ListRow icon={Eye} to={`/providers/${user.id}`} title={t('profile.account.viewPublic')} />
          </>
        ) : null}
      </Section>

      <Section title={t('profile.account.title')}>
        <ListRow icon={IdCard} label={t('profile.account.type')} value={t(`profile.roles.${user.role}`)} />
        <ListRow icon={LogOut} danger title={t('common.nav.logOut')} onClick={handleLogout} />
      </Section>
    </AppShell>
  );
}

export default ProfilePage;
