import AdminPagination from '../../components/admin/AdminPagination.jsx';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminTable from '../../components/admin/AdminTable.jsx';
import { PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';
import { formatTimestamp } from '../../utils/format.js';

const COLUMNS = [
  { key: 'customer', label: 'Customer', render: (row) => row.customer?.name || '—' },
  { key: 'rating', label: 'Rating', render: (row) => `${row.rating} / 5` },
  { key: 'comment', label: 'Comment', render: (row) => row.comment || '—' },
  { key: 'createdAt', label: 'Created', render: (row) => formatTimestamp(row.createdAt) },
];

function AdminReviewsPage() {
  const page = Number(useQueryParam('page')) || 1;
  const provider = useQueryParam('provider') || '';
  const customer = useQueryParam('customer') || '';

  const reviews = useApi(
    () => adminApi.reviews({ page, provider: provider || undefined, customer: customer || undefined }),
    [page, provider, customer],
  );

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
      <PageHeader title="Reviews" subtitle="Ratings and comments customers left for providers." />

      <AdminTable
        columns={COLUMNS}
        rows={reviews.data?.reviews || []}
        loading={reviews.loading}
        error={reviews.error}
        onRetry={reviews.reload}
        emptyTitle="No reviews found"
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
