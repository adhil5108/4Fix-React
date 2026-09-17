import { useState } from 'react';
import PasswordField from '../components/PasswordField.jsx';
import PhonePrefix from '../components/PhonePrefix.jsx';
import TextField from '../components/TextField.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { navigate } from '../hooks/useRoute.js';
import { getHomeRouteForRole } from '../utils/roles.js';

function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
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
      nextErrors.username = 'Enter your phone number.';
    }

    if (!form.password) {
      nextErrors.password = 'Enter your password.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const result = await login(form);
      navigate(getHomeRouteForRole(result.user.role));
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-heading">
        <div className="brand-logo" aria-hidden="true">
          <span className="brand-logo__mark">4</span>Fix
        </div>

        <h1 id="login-heading" className="auth-heading">
          Welcome back
        </h1>
        <p className="auth-subtext">Log in to continue with 4Fix.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {formError ? (
            <div className="form-alert" role="alert">
              {formError}
            </div>
          ) : null}

          <TextField
            id="username"
            label="Phone Number"
            value={form.username}
            error={errors.username}
            type="text"
            autoComplete="username"
            placeholder="Enter your phone number"
            prefix={<PhonePrefix />}
            onChange={(event) => updateField('username', event.target.value)}
          />
          <PasswordField
            id="password"
            label="Password"
            value={form.password}
            error={errors.password}
            autoComplete="current-password"
            placeholder="Enter your password"
            onChange={(event) => updateField('password', event.target.value)}
          />

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="auth-footer">
          New to 4Fix?{' '}
          <button type="button" className="text-link" onClick={() => navigate('/signup/customer')}>
            Create an account
          </button>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
