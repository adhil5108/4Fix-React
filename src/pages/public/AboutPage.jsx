import { useTranslation } from 'react-i18next';
import { Briefcase, House, Wrench } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import { ButtonLink, Card } from '../../components/ui.jsx';

const SECTIONS = [
  { key: 'what', icon: Wrench },
  { key: 'customers', icon: House, action: { to: '/services', label: 'browse' } },
  { key: 'providers', icon: Briefcase, action: { to: '/signup/provider', label: 'joinProvider' } },
];

function AboutPage() {
  const { t } = useTranslation();

  return (
    <AppShell title={t('public.about.title')} back={{ to: '/more', label: t('more.title') }}>
      <p className="intro-header__text">{t('public.about.subtitle')}</p>
      <div className="stack section">
        {SECTIONS.map(({ key, icon: Icon, action }) => (
          <Card key={key} className="about-card">
            <span className="list-row__icon" aria-hidden="true">
              <Icon />
            </span>
            <h2 className="card__title">{t(`public.about.${key}Title`)}</h2>
            <p className="card__text">{t(`public.about.${key}Text`)}</p>
            {action ? (
              <ButtonLink to={action.to} variant="secondary" size="sm">
                {t(`public.about.${action.label}`)}
              </ButtonLink>
            ) : null}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

export default AboutPage;
