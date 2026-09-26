import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import { ButtonLink, EmptyState } from '../../components/ui.jsx';

function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <AppShell width="narrow">
      <EmptyState
        title={t('public.notFound.title')}
        message={t('public.notFound.message')}
        action={<ButtonLink to="/">{t('public.notFound.goHome')}</ButtonLink>}
      />
    </AppShell>
  );
}

export default NotFoundPage;
