import AdminPagination from '../../components/admin/AdminPagination.jsx';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminTable from '../../components/admin/AdminTable.jsx';
import { Select } from '../../components/TextField.jsx';
import { PageHeader, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';
import { formatMoney, formatTimestamp } from '../../utils/format.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const COLUMNS = [
  { key: 'amount', label: 'Amount', render: (row) => formatMoney(row.amount) },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} audience="payment" /> },
  { key: 'method', label: 'Method', render: (row) => row.method || '—' },
  { key: 'paidAt', label: 'Paid', render: (row) => (row.paidAt ? formatTimestamp(row.paidAt) : '—') },
  { key: 'createdAt', label: 'Created', render: (row) => formatTimestamp(row.createdAt) },
];

function AdminPaymentsPage() {
  const page = Number(useQueryParam('page')) || 1;
  const status = useQueryParam('status') || '';
  const provider = useQueryParam('provider') || '';
  const customer = useQueryParam('customer') || '';

  const payments = useApi(
    () =>
      adminApi.payments({
        page,
        status: status || undefined,
        provider: provider || undefined,
        customer: customer || undefined,
      }),
    [page, status, provider, customer],
  );

  function updateQuery(next) {
    const params = new URLSearchParams({
      ...(status ? { status } : {}),
      ...(provider ? { provider } : {}),
      ...(customer ? { customer } : {}),
      page: '1',
      ...next,
    });

    for (const [key, value] of [...params.entries()]) {
      if (!value) params.delete(key);
    }

    navigate(`/app/admin/payments?${params.toString()}`, { replace: true });
  }

  return (
    <AdminShell>
      <PageHeader title="Payments" subtitle="Payments recorded against completed bookings." />

      <div className="admin-filters">
        <Select
          id="statusFilter"
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(event) => updateQuery({ status: event.target.value })}
        />
      </div>

      <AdminTable
        columns={COLUMNS}
        rows={payments.data?.payments || []}
        loading={payments.loading}
        error={payments.error}
        onRetry={payments.reload}
        emptyTitle="No payments found"
        getRowHref={(row) => `/app/admin/payments/${row.id}`}
      />

      {payments.data ? (
        <AdminPagination
          page={payments.data.page}
          totalPages={payments.data.totalPages}
          total={payments.data.total}
          onChange={(nextPage) => updateQuery({ page: String(nextPage) })}
        />
      ) : null}
    </AdminShell>
  );
}

export default AdminPaymentsPage;
