import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PasswordField from '../components/PasswordField.jsx';
import PhonePrefix from '../components/PhonePrefix.jsx';
import TextField from '../components/TextField.jsx';
import { Link } from '../components/ui.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { navigate, useQueryParam } from '../hooks/useRoute.js';
import { getSafeReturnTo, resolvePostAuthRoute } from '../utils/roles.js';

function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const returnTo = getSafeReturnTo(useQueryParam('returnTo'));
  const returnQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
  const [form, setForm] = useState({ username: '', password: '' });
  // Field errors hold translation keys so they follow a language switch.
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

    const nextErrors = {};

    if (!form.username.trim()) {
      nextErrors.username = 'auth.errors.phoneRequired';
    }

    if (!form.password) {
      nextErrors.password = 'auth.errors.passwordRequired';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const result = await login(form);
      navigate(resolvePostAuthRoute(result.user.role, returnTo), { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-heading">
        <Link to="/" className="brand-logo" aria-label={t('common.brand.homeAria')}>
          <span className="brand-logo__mark">4</span>Fix
        </Link>

        <h1 id="login-heading" className="auth-heading">
          {t('auth.login.heading')}
        </h1>
        <p className="auth-subtext">{t('auth.login.subtext')}</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {formError ? (
            <div className="form-alert" role="alert">
              {formError}
            </div>
          ) : null}

          <TextField
            id="username"
            label={t('auth.fields.phone')}
            value={form.username}
            error={errors.username ? t(errors.username) : ''}
            type="text"
            autoComplete="username"
            placeholder={t('auth.fields.phonePlaceholder')}
            prefix={<PhonePrefix />}
            onChange={(event) => updateField('username', event.target.value)}
          />
          <PasswordField
            id="password"
            label={t('auth.fields.password')}
            value={form.password}
            error={errors.password ? t(errors.password) : ''}
            autoComplete="current-password"
            placeholder={t('auth.fields.passwordPlaceholder')}
            onChange={(event) => updateField('password', event.target.value)}
          />

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('auth.login.submitting') : t('common.nav.logIn')}
          </button>
        </form>

        <p className="auth-footer">
          {t('auth.login.newHere')}{' '}
          <button type="button" className="text-link" onClick={() => navigate(`/signup/provider${returnQuery}`)}>
            {t('auth.login.createAccount')}
          </button>
        </p>
        <p className="auth-footer auth-footer--note">
          {t('auth.login.customerNote')}{' '}
          <button type="button" className="text-link" onClick={() => navigate('/services')}>
            {t('common.nav.bookService')}
          </button>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
