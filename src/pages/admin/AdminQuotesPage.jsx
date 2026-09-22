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
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
];

const COLUMNS = [
  { key: 'request', label: 'Request', render: (row) => row.request?.service?.name || '—' },
  { key: 'customer', label: 'Customer', render: (row) => row.request?.customer?.name || '—' },
  { key: 'provider', label: 'Provider', render: (row) => row.provider?.name || '—' },
  { key: 'amount', label: 'Amount', render: (row) => formatMoney(row.amount) },
  {
    key: 'status',
    label: 'Quote status',
    render: (row) => <StatusBadge status={row.status} audience="quote" />,
  },
  {
    key: 'requestStatus',
    label: 'Request status',
    render: (row) => (row.request?.status ? <StatusBadge status={row.request.status} /> : '—'),
  },
  { key: 'createdAt', label: 'Created', render: (row) => formatTimestamp(row.createdAt) },
  { key: 'isSelected', label: 'Selected?', render: (row) => (row.isSelected ? 'Yes' : '—') },
];

function AdminQuotesPage() {
  const page = Number(useQueryParam('page')) || 1;
  const status = useQueryParam('status') || '';
  const provider = useQueryParam('provider') || '';
  const customer = useQueryParam('customer') || '';
  const request = useQueryParam('request') || '';
  const service = useQueryParam('service') || '';

  const quotes = useApi(
    () =>
      adminApi.quotes({
        page,
        status: status || undefined,
        provider: provider || undefined,
        customer: customer || undefined,
        request: request || undefined,
        service: service || undefined,
      }),
    [page, status, provider, customer, request, service],
  );

  function updateQuery(next) {
    const params = new URLSearchParams({
      ...(status ? { status } : {}),
      ...(provider ? { provider } : {}),
      ...(customer ? { customer } : {}),
      ...(request ? { request } : {}),
      ...(service ? { service } : {}),
      page: '1',
      ...next,
    });

    for (const [key, value] of [...params.entries()]) {
      if (!value) params.delete(key);
    }

    navigate(`/app/admin/quotes?${params.toString()}`, { replace: true });
  }

  return (
    <AdminShell>
      <PageHeader title="Quotes" subtitle="Every quote a provider has sent a customer." />

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
        rows={quotes.data?.quotes || []}
        loading={quotes.loading}
        error={quotes.error}
        onRetry={quotes.reload}
        emptyTitle="No quotes found"
        getRowHref={(row) => `/app/admin/quotes/${row.id}`}
      />

      {quotes.data ? (
        <AdminPagination
          page={quotes.data.page}
          totalPages={quotes.data.totalPages}
          total={quotes.data.total}
          onChange={(nextPage) => updateQuery({ page: String(nextPage) })}
        />
      ) : null}
    </AdminShell>
  );
}

export default AdminQuotesPage;
