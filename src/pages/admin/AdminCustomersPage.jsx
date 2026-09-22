import AdminPagination from '../../components/admin/AdminPagination.jsx';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminTable from '../../components/admin/AdminTable.jsx';
import { Select } from '../../components/TextField.jsx';
import { PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';
import { formatTimestamp } from '../../utils/format.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'username', label: 'Phone' },
  { key: 'createdAt', label: 'Joined', render: (row) => formatTimestamp(row.createdAt) },
  {
    key: 'isActive',
    label: 'Status',
    render: (row) => (
      <span className={`badge badge--${row.isActive ? 'success' : 'muted'}`}>
        {row.isActive ? 'Active' : 'Deactivated'}
      </span>
    ),
  },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Deactivated' },
];

function AdminCustomersPage() {
  const page = Number(useQueryParam('page')) || 1;
  const isActive = useQueryParam('isActive') || '';
  const search = useQueryParam('search') || '';
  const customers = useApi(
    () => adminApi.customers({ page, isActive: isActive || undefined, search: search || undefined }),
    [page, isActive, search],
  );

  function updateQuery(next) {
    const params = new URLSearchParams({
      ...(isActive ? { isActive } : {}),
      ...(search ? { search } : {}),
      page: '1',
      ...next,
    });

    for (const [key, value] of [...params.entries()]) {
      if (!value) params.delete(key);
    }

    navigate(`/app/admin/customers?${params.toString()}`, { replace: true });
  }

  return (
    <AdminShell>
      <PageHeader title="Customers" subtitle="Everyone who has signed up to book a service." />

      <div className="admin-filters">
        <Select
          id="isActiveFilter"
          label="Status"
          value={isActive}
          options={STATUS_OPTIONS}
          onChange={(event) => updateQuery({ isActive: event.target.value })}
        />
        <div className="field">
          <label htmlFor="searchFilter">Search</label>
          <div className="field-control">
            <input
              id="searchFilter"
              className="field-input"
              type="search"
              placeholder="Name or phone"
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
        rows={customers.data?.customers || []}
        loading={customers.loading}
        error={customers.error}
        onRetry={customers.reload}
        emptyTitle="No customers found"
        getRowHref={(row) => `/app/admin/customers/${row.id}`}
      />

      {customers.data ? (
        <AdminPagination
          page={customers.data.page}
          totalPages={customers.data.totalPages}
          total={customers.data.total}
          onChange={(nextPage) => updateQuery({ page: String(nextPage) })}
        />
      ) : null}
    </AdminShell>
  );
}

export default AdminCustomersPage;
