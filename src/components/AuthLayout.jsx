import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { BackButton, Link } from './ui.jsx';

// Provider/admin login and provider signup: the same type, colours and components as the
// app, with a way back for customers who landed here by mistake and a language switch.
function AuthLayout({ heading, subtext, children, footer }) {
  const { t } = useTranslation();

  return (
    <div className="auth">
      <header className="auth__bar">
        <BackButton to="/" label={t('common.nav.home')} />
        <LanguageSwitcher compact />
      </header>
      <main className="auth__main">
        <Link to="/" className="auth__brand" aria-label={t('common.brand.homeAria')}>
          <span className="brand-mark">4</span>Fix
        </Link>
        <h1 className="auth__heading">{heading}</h1>
        {subtext ? <p className="auth__subtext">{subtext}</p> : null}
        {children}
        {footer ? <div className="auth__footer">{footer}</div> : null}
      </main>
    </div>
  );
}

export default AuthLayout;
