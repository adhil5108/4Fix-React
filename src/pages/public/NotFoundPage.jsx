import { useTranslation } from 'react-i18next';
import { SearchX } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import { ButtonLink, EmptyState } from '../../components/ui.jsx';

function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <AppShell brand>
      <EmptyState
        icon={SearchX}
        title={t('public.notFound.title')}
        message={t('public.notFound.message')}
        action={<ButtonLink to="/">{t('public.notFound.goHome')}</ButtonLink>}
      />
    </AppShell>
  );
}

export default NotFoundPage;
