import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CategoryPicker from '../components/CategoryPicker.jsx';
import PasswordField from '../components/PasswordField.jsx';
import PhonePrefix from '../components/PhonePrefix.jsx';
import ShopLocationField from '../components/ShopLocationField.jsx';
import TextField from '../components/TextField.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { Button, Notice } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { navigate, useQueryParam } from '../hooks/useRoute.js';
import { categoriesApi } from '../services/fixApi.js';
import { getSafeReturnTo, resolvePostAuthRoute } from '../utils/roles.js';

const initialForm = {
  phoneNumber: '',
  name: '',
  password: '',
  confirmPassword: '',
};

// Returns translation keys (translated where rendered) so errors follow a language switch.
function validateForm(form, shopLocation, categories) {
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

  // Registration takes the shop address only (same length rule as an address line).
  const shopAddress = shopLocation?.address?.trim() || '';
  if (!shopAddress) {
    errors.shopLocationAddress = 'auth.errors.shopAddressRequired';
  } else if (shopAddress.length < 5) {
    errors.shopLocationAddress = 'auth.errors.shopAddressShort';
  }

  if (categories.length === 0) {
    errors.categories = 'auth.errors.categoriesRequired';
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
  const [categories, setCategories] = useState([]);
  const categoryList = useApi(() => categoriesApi.list(), []);
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

    const nextErrors = validateForm(form, shopLocation, categories);

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
        shopLocation: { address: shopLocation.address.trim() },
        categories,
      });
      navigate(resolvePostAuthRoute(result.user.role, returnTo), { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      heading={t('auth.signup.PROVIDER.heading')}
      subtext={t('auth.signup.PROVIDER.subtext')}
      footer={
        <p>
          {t('auth.signup.haveAccount')}{' '}
          <button type="button" className="link" onClick={() => navigate('/login' + returnQuery)}>
            {t('common.nav.logIn')}
          </button>
        </p>
      }
    >
      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <Notice>{formError}</Notice>

        <section className="form-section" aria-labelledby="signup-you">
          <h2 id="signup-you" className="form-section__title">
            {t('auth.signup.aboutYouTitle')}
          </h2>
          <div className="form-stack">
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
          </div>
        </section>

        <section className="form-section" aria-labelledby="signup-categories">
          <h2 id="signup-categories" className="form-section__title">
            {t('auth.signup.categoriesTitle')}
          </h2>
          {categoryList.loading ? <p className="field-hint">{t('auth.signup.categoriesLoading')}</p> : null}
          {categoryList.error ? (
            <p className="field-error">
              {categoryList.error.message}{' '}
              <button type="button" className="link" onClick={categoryList.reload}>
                {t('common.actions.tryAgain')}
              </button>
            </p>
          ) : null}
          {categoryList.data ? (
            <CategoryPicker
              categories={categoryList.data.categories}
              value={categories}
              disabled={isSubmitting}
              error={errors.categories ? t(errors.categories) : ''}
              onChange={(next) => {
                setCategories(next);
                setErrors((current) => ({ ...current, categories: '' }));
                setFormError('');
              }}
            />
          ) : null}
        </section>

        <section className="form-section" aria-labelledby="signup-shop">
          <h2 id="signup-shop" className="form-section__title">
            {t('auth.signup.shopLocationTitle')}
          </h2>
          <p className="field-hint section-hint">{t('auth.signup.shopLocationHint')}</p>
          <ShopLocationField
            manualOnly
            value={shopLocation}
            error={errors.shopLocationAddress ? t(errors.shopLocationAddress) : ''}
            disabled={isSubmitting}
            onChange={(next) => {
              setShopLocation(next);
              setErrors((current) => ({ ...current, shopLocationAddress: '' }));
              setFormError('');
            }}
          />
        </section>

        <Button type="submit" block size="lg" loading={isSubmitting} loadingText={t('auth.signup.submitting')}>
          {t('auth.signup.PROVIDER.cta')}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default SignupPage;
