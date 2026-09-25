import AdminPagination from '../../components/admin/AdminPagination.jsx';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminTable from '../../components/admin/AdminTable.jsx';
import { Select } from '../../components/TextField.jsx';
import { PageHeader, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';
import { formatSlot } from '../../utils/format.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const COLUMNS = [
  { key: 'service', label: 'Service', render: (row) => row.service?.name || '—' },
  { key: 'customer', label: 'Customer', render: (row) => row.customer?.name || '—' },
  { key: 'provider', label: 'Provider', render: (row) => row.provider?.name || '—' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} audience="booking" /> },
  {
    key: 'scheduledDate',
    label: 'Scheduled',
    render: (row) => (row.scheduledDate ? formatSlot(row.scheduledDate, row.scheduledTime) : '—'),
  },
];

function AdminBookingsPage() {
  const page = Number(useQueryParam('page')) || 1;
  const status = useQueryParam('status') || '';
  const provider = useQueryParam('provider') || '';
  const customer = useQueryParam('customer') || '';

  const bookings = useApi(
    () =>
      adminApi.bookings({
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

    navigate(`/app/admin/bookings?${params.toString()}`, { replace: true });
  }

  return (
    <AdminShell>
      <PageHeader title="Bookings" subtitle="Confirmed customer/provider bookings." />

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
        rows={bookings.data?.bookings || []}
        loading={bookings.loading}
        error={bookings.error}
        onRetry={bookings.reload}
        emptyTitle="No bookings found"
        getRowHref={(row) => `/app/admin/bookings/${row.id}`}
      />

      {bookings.data ? (
        <AdminPagination
          page={bookings.data.page}
          totalPages={bookings.data.totalPages}
          total={bookings.data.total}
          onChange={(nextPage) => updateQuery({ page: String(nextPage) })}
        />
      ) : null}
    </AdminShell>
  );
}

export default AdminBookingsPage;
