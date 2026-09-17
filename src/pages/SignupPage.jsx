import { useState } from 'react';
import PasswordField from '../components/PasswordField.jsx';
import PhonePrefix from '../components/PhonePrefix.jsx';
import TextField from '../components/TextField.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { navigate } from '../hooks/useRoute.js';
import { getHomeRouteForRole } from '../utils/roles.js';

const signupContent = {
  CUSTOMER: {
    heading: 'Create your 4Fix account',
    subtext: 'Get help with repairs, maintenance and home services.',
    cta: 'Create account',
  },
  PROVIDER: {
    heading: 'Join 4Fix as a service provider',
    subtext: 'Offer your services and connect with people who need them.',
    cta: 'Create provider account',
  },
};

const initialForm = {
  phoneNumber: '',
  name: '',
  password: '',
  confirmPassword: '',
};

function validateForm(form) {
  const errors = {};

  if (!form.phoneNumber.trim()) {
    errors.phoneNumber = 'Enter your phone number.';
  }

  if (!form.name.trim()) {
    errors.name = 'Enter your full name.';
  }

  if (!form.password) {
    errors.password = 'Enter a password.';
  } else if (form.password.length < 8) {
    errors.password = 'Use at least 8 characters.';
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.';
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

function SignupPage({ role }) {
  const content = signupContent[role];
  const { signupCustomer, signupProvider } = useAuth();
  const [form, setForm] = useState(initialForm);
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

    const nextErrors = validateForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const result = role === 'CUSTOMER' ? await signupCustomer(form) : await signupProvider(form);
      navigate(getHomeRouteForRole(result.user.role));
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="signup-heading">
        <div className="brand-logo" aria-hidden="true">
          <span className="brand-logo__mark">4</span>Fix
        </div>

        <h1 id="signup-heading" className="auth-heading">
          {content.heading}
        </h1>
        <p className="auth-subtext">{content.subtext}</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {formError ? (
            <div className="form-alert" role="alert">
              {formError}
            </div>
          ) : null}

          <TextField
            id="phoneNumber"
            label="Phone Number"
            value={form.phoneNumber}
            error={errors.phoneNumber}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Enter your phone number"
            prefix={<PhonePrefix />}
            onChange={(event) => updateField('phoneNumber', event.target.value)}
          />
          <TextField
            id="name"
            label="Full Name"
            value={form.name}
            error={errors.name}
            autoComplete="name"
            placeholder="Enter your full name"
            onChange={(event) => updateField('name', event.target.value)}
          />
          <PasswordField
            id="password"
            label="Password"
            value={form.password}
            error={errors.password}
            autoComplete="new-password"
            placeholder="Enter password"
            onChange={(event) => updateField('password', event.target.value)}
          />
          <PasswordField
            id="confirmPassword"
            label="Confirm Password"
            value={form.confirmPassword}
            error={errors.confirmPassword}
            autoComplete="new-password"
            placeholder="Re-enter password"
            onChange={(event) => updateField('confirmPassword', event.target.value)}
          />

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : content.cta}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <button type="button" className="text-link" onClick={() => navigate('/login')}>
            Log in
          </button>
        </p>
      </section>
    </main>
  );
}

export default SignupPage;
