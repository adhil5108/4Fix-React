import AdminPagination from '../../components/admin/AdminPagination.jsx';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminTable from '../../components/admin/AdminTable.jsx';
import { Select } from '../../components/TextField.jsx';
import { PageHeader, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';
import { REQUEST_STATUSES, formatTimestamp, statusLabel } from '../../utils/format.js';

const COLUMNS = [
  { key: 'customer', label: 'Customer', render: (row) => row.customer?.name || '—' },
  { key: 'service', label: 'Service', render: (row) => row.service?.name || '—' },
  { key: 'issueLabel', label: 'Issue', render: (row) => row.issueLabel || '—' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'createdAt', label: 'Created', render: (row) => formatTimestamp(row.createdAt) },
];

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...REQUEST_STATUSES.map((status) => ({
  value: status,
  label: statusLabel(status),
}))];

function AdminRequestsPage() {
  const page = Number(useQueryParam('page')) || 1;
  const status = useQueryParam('status') || '';
  const search = useQueryParam('search') || '';
  const customer = useQueryParam('customer') || '';
  const provider = useQueryParam('provider') || '';
  const service = useQueryParam('service') || '';

  const requests = useApi(
    () => adminApi.requests({ page, status: status || undefined, search: search || undefined, customer: customer || undefined, provider: provider || undefined, service: service || undefined }),
    [page, status, search, customer, provider, service],
  );

  function updateQuery(next) {
    const params = new URLSearchParams({
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
      ...(customer ? { customer } : {}),
      ...(provider ? { provider } : {}),
      ...(service ? { service } : {}),
      page: '1',
      ...next,
    });

    for (const [key, value] of [...params.entries()]) {
      if (!value) params.delete(key);
    }

    navigate(`/app/admin/requests?${params.toString()}`, { replace: true });
  }

  return (
    <AdminShell>
      <PageHeader title="Requests" subtitle="Every service request raised by a customer." />

      <div className="admin-filters">
        <Select
          id="statusFilter"
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(event) => updateQuery({ status: event.target.value })}
        />
        <div className="field">
          <label htmlFor="searchFilter">Search description</label>
          <div className="field-control">
            <input
              id="searchFilter"
              className="field-input"
              type="search"
              placeholder="Search"
              defaultValue={search}
              onKeyDown={(event) => {
                if (event.key === 'Enter') updateQuery({ search: event.currentTarget.value });
              }}
              onBlur={(event) => updateQuery({ search: event.currentTarget.value })}
            />
          </div>
        </div>
      </div>

      <AdminTable
        columns={COLUMNS}
        rows={requests.data?.requests || []}
        loading={requests.loading}
        error={requests.error}
        onRetry={requests.reload}
        emptyTitle="No requests found"
        getRowHref={(row) => `/app/admin/requests/${row.id}`}
      />

      {requests.data ? (
        <AdminPagination
          page={requests.data.page}
          totalPages={requests.data.totalPages}
          total={requests.data.total}
          onChange={(nextPage) => updateQuery({ page: String(nextPage) })}
        />
      ) : null}
    </AdminShell>
  );
}

export default AdminRequestsPage;
