import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PasswordField from '../components/PasswordField.jsx';
import PhonePrefix from '../components/PhonePrefix.jsx';
import ShopLocationField from '../components/ShopLocationField.jsx';
import TextField from '../components/TextField.jsx';
import { Link } from '../components/ui.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { navigate, useQueryParam } from '../hooks/useRoute.js';
import { getSafeReturnTo, resolvePostAuthRoute } from '../utils/roles.js';

const initialForm = {
  phoneNumber: '',
  name: '',
  password: '',
  confirmPassword: '',
};

// Returns translation keys (translated where rendered) so errors follow a language switch.
function validateForm(form, shopLocation) {
  const errors = {};

  if (!form.phoneNumber.trim()) {
    errors.phoneNumber = 'auth.errors.phoneRequired';
  }

  if (!form.name.trim()) {
    errors.name = 'auth.errors.nameRequired';
  }

  if (!form.password) {
    errors.password = 'auth.errors.newPasswordRequired';
  } else if (form.password.length < 8) {
    errors.password = 'auth.errors.passwordTooShort';
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'auth.errors.confirmRequired';
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'auth.errors.passwordMismatch';
  }

  if (!shopLocation) {
    errors.shopLocation = 'auth.errors.shopLocationRequired';
  }

  return errors;
}

// Provider signup — the only account type. Customers use 4Fix without signing up.
function SignupPage() {
  const { t } = useTranslation();
  const { signupProvider } = useAuth();
  const returnTo = getSafeReturnTo(useQueryParam('returnTo'));
  const returnQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
  const [form, setForm] = useState(initialForm);
  const [shopLocation, setShopLocation] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: '' }));
    setFormError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const nextErrors = validateForm(form, shopLocation);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const result = await signupProvider({
        ...form,
        shopLocation: {
          latitude: shopLocation.latitude,
          longitude: shopLocation.longitude,
          address: shopLocation.address?.trim() || undefined,
        },
      });
      navigate(resolvePostAuthRoute(result.user.role, returnTo), { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="signup-heading">
        <Link to="/" className="brand-logo" aria-label={t('common.brand.homeAria')}>
          <span className="brand-logo__mark">4</span>Fix
        </Link>

        <h1 id="signup-heading" className="auth-heading">
          {t('auth.signup.PROVIDER.heading')}
        </h1>
        <p className="auth-subtext">{t('auth.signup.PROVIDER.subtext')}</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {formError ? (
            <div className="form-alert" role="alert">
              {formError}
            </div>
          ) : null}

          <TextField
            id="phoneNumber"
            label={t('auth.fields.phone')}
            value={form.phoneNumber}
            error={errors.phoneNumber ? t(errors.phoneNumber) : ''}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder={t('auth.fields.phonePlaceholder')}
            prefix={<PhonePrefix />}
            onChange={(event) => updateField('phoneNumber', event.target.value)}
          />
          <TextField
            id="name"
            label={t('auth.fields.fullName')}
            value={form.name}
            error={errors.name ? t(errors.name) : ''}
            autoComplete="name"
            placeholder={t('auth.fields.fullNamePlaceholder')}
            onChange={(event) => updateField('name', event.target.value)}
          />
          <PasswordField
            id="password"
            label={t('auth.fields.password')}
            value={form.password}
            error={errors.password ? t(errors.password) : ''}
            autoComplete="new-password"
            placeholder={t('auth.fields.newPasswordPlaceholder')}
            onChange={(event) => updateField('password', event.target.value)}
          />
          <PasswordField
            id="confirmPassword"
            label={t('auth.fields.confirmPassword')}
            value={form.confirmPassword}
            error={errors.confirmPassword ? t(errors.confirmPassword) : ''}
            autoComplete="new-password"
            placeholder={t('auth.fields.confirmPasswordPlaceholder')}
            onChange={(event) => updateField('confirmPassword', event.target.value)}
          />

          <fieldset className="auth-fieldset">
            <legend className="auth-legend">{t('auth.signup.shopLocationTitle')}</legend>
            <p className="field-hint">{t('auth.signup.shopLocationHint')}</p>
            <ShopLocationField
              value={shopLocation}
              error={errors.shopLocation ? t(errors.shopLocation) : ''}
              disabled={isSubmitting}
              onChange={(next) => {
                setShopLocation(next);
                setErrors((current) => ({ ...current, shopLocation: '' }));
                setFormError('');
              }}
            />
          </fieldset>

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('auth.signup.submitting') : t('auth.signup.PROVIDER.cta')}
          </button>
        </form>

        <p className="auth-footer">
          {t('auth.signup.haveAccount')}{' '}
          <button type="button" className="text-link" onClick={() => navigate(`/login${returnQuery}`)}>
            {t('common.nav.logIn')}
          </button>
        </p>
      </section>
    </main>
  );
}

export default SignupPage;
