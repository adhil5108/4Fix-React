import { useTranslation } from 'react-i18next';
import { Briefcase, ClipboardList, Info, Languages, LogIn } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx';
import { ListGroup, ListRow } from '../../components/ui.jsx';

// Customers have no account, so this tab holds settings and links rather than a profile.
function MorePage() {
  const { t } = useTranslation();

  return (
    <AppShell title={t('more.title')} large>
      <div className="stack stack--lg">
        <ListGroup title={t('more.settings')}>
          <ListRow icon={Languages} title={t('common.language.label')} trailing={<LanguageSwitcher />} />
        </ListGroup>

        <ListGroup title={t('more.yourRequests')}>
          <ListRow icon={ClipboardList} to="/requests" title={t('common.nav.myRequests')} value={t('more.deviceNote')} muted />
        </ListGroup>

        <ListGroup title={t('more.about')}>
          <ListRow icon={Info} to="/about" title={t('more.aboutTitle')} />
        </ListGroup>

        <ListGroup title={t('more.providers')}>
          <ListRow icon={LogIn} to="/login" title={t('common.nav.providerLogin')} />
          <ListRow icon={Briefcase} to="/signup/provider" title={t('public.home.joinProvider')} value={t('public.home.providerText')} muted />
        </ListGroup>
      </div>
    </AppShell>
  );
}

export default MorePage;
