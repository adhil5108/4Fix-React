import { useTranslation } from 'react-i18next';
import AdminPagination from '../../components/admin/AdminPagination.jsx';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminTable from '../../components/admin/AdminTable.jsx';
import { PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';
import { formatTimestamp } from '../../utils/format.js';

// Column labels are i18n keys, translated at render.
const COLUMNS = [
  { key: 'customer', label: 'admin.fields.customer', render: (row) => row.customer?.name || '—' },
  { key: 'rating', label: 'admin.fields.rating', render: (row, t) => t('admin.shared.ratingOutOf', { rating: row.rating }) },
  { key: 'comment', label: 'admin.fields.comment', render: (row) => row.comment || '—' },
  { key: 'createdAt', label: 'admin.fields.created', render: (row) => formatTimestamp(row.createdAt) },
];

function AdminReviewsPage() {
  const { t } = useTranslation();
  const page = Number(useQueryParam('page')) || 1;
  const provider = useQueryParam('provider') || '';
  const customer = useQueryParam('customer') || '';

  const reviews = useApi(
    () => adminApi.reviews({ page, provider: provider || undefined, customer: customer || undefined }),
    [page, provider, customer],
  );

  const columns = COLUMNS.map((column) => ({
    ...column,
    label: t(column.label),
    render: column.render ? (row) => column.render(row, t) : undefined,
  }));

  function updateQuery(next) {
    const params = new URLSearchParams({
      ...(provider ? { provider } : {}),
      ...(customer ? { customer } : {}),
      page: '1',
      ...next,
    });

    for (const [key, value] of [...params.entries()]) {
      if (!value) params.delete(key);
    }

    navigate(`/app/admin/reviews?${params.toString()}`, { replace: true });
  }

  return (
    <AdminShell>
      <PageHeader title={t('common.adminNav.reviews')} subtitle={t('admin.reviews.subtitle')} />

      <AdminTable
        columns={columns}
        rows={reviews.data?.reviews || []}
        loading={reviews.loading}
        error={reviews.error}
        onRetry={reviews.reload}
        emptyTitle={t('admin.reviews.emptyTitle')}
        getRowHref={(row) => `/app/admin/reviews/${row.id}`}
      />

      {reviews.data ? (
        <AdminPagination
          page={reviews.data.page}
          totalPages={reviews.data.totalPages}
          total={reviews.data.total}
          onChange={(nextPage) => updateQuery({ page: String(nextPage) })}
        />
      ) : null}
    </AdminShell>
  );
}

export default AdminReviewsPage;
