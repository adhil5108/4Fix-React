import { useTranslation } from 'react-i18next';
import AdminShell from '../../components/admin/AdminShell.jsx';
import { StarRating } from '../../components/StarRating.jsx';
import { Card, ErrorState, Link, LoadingState, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { adminApi } from '../../services/fixApi.js';
import { formatTimestamp } from '../../utils/format.js';

function AdminReviewDetailPage({ reviewId }) {
  const { t } = useTranslation();
  const data = useApi(() => adminApi.review(reviewId), [reviewId]);
  const back = { to: '/app/admin/reviews', label: t('common.adminNav.reviews') };

  if (data.loading) {
    return (
      <AdminShell>
        <LoadingState label={t('admin.reviewDetail.loading')} />
      </AdminShell>
    );
  }

  if (data.error) {
    return (
      <AdminShell>
        <PageHeader title={t('admin.reviewDetail.fallbackTitle')} back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AdminShell>
    );
  }

  const { review } = data.data;

  return (
    <AdminShell>
      <PageHeader back={back} title={t('admin.reviewDetail.title', { name: review.customer?.name || t('admin.shared.customerFallback') })} />

      <Card className="review-card">
        <div className="review-card__top">
          <StarRating value={review.rating} readOnly />
          <span className="review-card__meta">{formatTimestamp(review.createdAt)}</span>
        </div>
        {review.comment ? <p className="review-card__comment">{review.comment}</p> : null}
        <div className="card__links">
          <Link to={`/app/admin/bookings/${review.bookingId}`} className="text-link">
            {t('admin.reviewDetail.viewBooking')}
          </Link>
          <Link to={`/app/admin/providers/${review.providerId}`} className="text-link">
            {t('admin.reviewDetail.viewProvider')}
          </Link>
        </div>
      </Card>
    </AdminShell>
  );
}

export default AdminReviewDetailPage;
