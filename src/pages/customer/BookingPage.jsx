import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import { EmptyState } from '../../components/ui.jsx';
import { navigate } from '../../hooks/useRoute.js';
import { requestIdForBooking } from '../../services/customerAccess.js';

// The customer's job lives on one screen: /requests/:requestId. Old /bookings/:id links
// (notifications, bookmarks) land there, using this browser's saved request.
function BookingPage({ bookingId }) {
  const { t } = useTranslation();
  const requestId = requestIdForBooking(bookingId);

  useEffect(() => {
    if (requestId) {
      navigate(`/requests/${encodeURIComponent(requestId)}`, { replace: true });
    }
  }, [requestId]);

  if (requestId) {
    return null;
  }

  return (
    <AppShell title={t('customer.shared.booking')} back={{ to: '/requests', label: t('common.nav.myRequests') }}>
      <EmptyState icon={Smartphone} title={t('customer.access.noAccessTitle')} message={t('customer.access.noAccessMessage')} />
    </AppShell>
  );
}

export default BookingPage;
