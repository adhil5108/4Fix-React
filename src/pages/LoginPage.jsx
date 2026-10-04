import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PasswordField from '../components/PasswordField.jsx';
import TextField from '../components/TextField.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { Button, Notice } from '../components/ui.jsx';
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
    <AuthLayout
      heading={t('auth.login.heading')}
      subtext={t('auth.login.subtext')}
      footer={
        <>
          <p>
            {t('auth.login.newHere')}{' '}
            <button type="button" className="link" onClick={() => navigate('/signup/provider' + returnQuery)}>
              {t('auth.login.createAccount')}
            </button>
          </p>
          <p>
            {t('auth.login.customerNote')}{' '}
            <button type="button" className="link" onClick={() => navigate('/services')}>
              {t('common.nav.bookService')}
            </button>
          </p>
        </>
      }
    >
      <form className="auth__form" onSubmit={handleSubmit} noValidate>
        <Notice>{formError}</Notice>
        <div className="form-stack">
          <TextField
            id="username"
            label={t('auth.fields.phone')}
            value={form.username}
            error={errors.username ? t(errors.username) : ''}
            type="text"
            inputMode="tel"
            autoComplete="username"
            placeholder={t('auth.fields.phonePlaceholder')}
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
        </div>
        <Button type="submit" block size="lg" loading={isSubmitting} loadingText={t('auth.login.submitting')}>
          {t('common.nav.logIn')}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
