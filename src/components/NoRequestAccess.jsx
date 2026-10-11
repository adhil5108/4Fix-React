import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react';
import { ButtonLink, EmptyState } from './ui.jsx';

// Shown to a customer whose browser has no access token for the request/job in the URL.
// Customers have no account, so the way back is "My requests" (requests sent from this
// phone) or the private link; a new request is the secondary way forward.
function NoRequestAccess() {
  const { t } = useTranslation();

  return (
    <EmptyState
      icon={Smartphone}
      title={t('customer.access.noAccessTitle')}
      message={t('customer.access.noAccessMessage')}
      action={
        <div className="state__actions">
          <ButtonLink to="/requests" block>
            {t('customer.access.myRequests')}
          </ButtonLink>
          <ButtonLink to="/services" variant="secondary" block>
            {t('customer.access.newRequest')}
          </ButtonLink>
        </div>
      }
    />
  );
}

export default NoRequestAccess;
