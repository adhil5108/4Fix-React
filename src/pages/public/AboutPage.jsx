import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import { ButtonLink, Card, PageHeader } from '../../components/ui.jsx';

function AboutPage() {
  const { t } = useTranslation();

  return (
    <AppShell width="narrow">
      <PageHeader title={t('public.about.title')} subtitle={t('public.about.subtitle')} />

      <Card>
        <h2 className="card__title">{t('public.about.whatTitle')}</h2>
        <p className="body-text">{t('public.about.whatText')}</p>
      </Card>

      <Card>
        <h2 className="card__title">{t('public.about.customersTitle')}</h2>
        <p className="body-text">{t('public.about.customersText')}</p>
        <ButtonLink to="/services" variant="secondary">
          {t('public.about.browse')}
        </ButtonLink>
      </Card>

      <Card>
        <h2 className="card__title">{t('public.about.providersTitle')}</h2>
        <p className="body-text">{t('public.about.providersText')}</p>
        <ButtonLink to="/signup/provider" variant="secondary">
          {t('public.about.joinProvider')}
        </ButtonLink>
      </Card>
    </AppShell>
  );
}

export default AboutPage;
