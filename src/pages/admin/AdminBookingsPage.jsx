import { useTranslation } from 'react-i18next';
import AdminPagination from '../../components/admin/AdminPagination.jsx';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminTable from '../../components/admin/AdminTable.jsx';
import { Select } from '../../components/TextField.jsx';
import { PageHeader, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';
import { formatTimestamp } from '../../utils/format.js';

// Option/column labels are i18n keys, translated at render.
const STATUS_OPTIONS = [
  { value: '', label: 'admin.shared.allStatuses' },
  { value: 'UPCOMING', label: 'common.status.groups.UPCOMING' },
  { value: 'ACTIVE', label: 'common.status.groups.ACTIVE' },
  { value: 'COMPLETED', label: 'common.status.groups.COMPLETED' },
  { value: 'CANCELLED', label: 'common.status.groups.CANCELLED' },
];

const COLUMNS = [
  { key: 'service', label: 'admin.fields.service', render: (row) => row.service?.name || '—' },
  { key: 'customer', label: 'admin.fields.customer', render: (row) => row.customer?.name || '—' },
  { key: 'provider', label: 'admin.fields.provider', render: (row) => row.provider?.name || '—' },
  { key: 'status', label: 'admin.fields.status', render: (row) => <StatusBadge status={row.status} audience="booking" /> },
  {
    key: 'confirmedAt',
    label: 'admin.fields.accepted',
    render: (row) => (row.confirmedAt ? formatTimestamp(row.confirmedAt) : '—'),
  },
];

function AdminBookingsPage() {
  const { t } = useTranslation();
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

  const columns = COLUMNS.map((column) => ({
    ...column,
    label: t(column.label),
    render: column.render ? (row) => column.render(row, t) : undefined,
  }));
  const statusOptions = STATUS_OPTIONS.map((option) => ({ ...option, label: t(option.label) }));

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
      <PageHeader title={t('common.adminNav.bookings')} subtitle={t('admin.bookings.subtitle')} />

      <div className="admin-filters">
        <Select
          id="statusFilter"
          label={t('admin.fields.status')}
          value={status}
          options={statusOptions}
          onChange={(event) => updateQuery({ status: event.target.value })}
        />
      </div>

      <AdminTable
        columns={columns}
        rows={bookings.data?.bookings || []}
        loading={bookings.loading}
        error={bookings.error}
        onRetry={bookings.reload}
        emptyTitle={t('admin.bookings.emptyTitle')}
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
