import AdminPagination from '../../components/admin/AdminPagination.jsx';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminTable from '../../components/admin/AdminTable.jsx';
import { Select } from '../../components/TextField.jsx';
import { ButtonLink } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { formatCategory, formatMoney } from '../../utils/format.js';
import { adminApi } from '../../services/fixApi.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category', render: (row) => formatCategory(row.category) },
  {
    key: 'startingPrice',
    label: 'Starting price',
    render: (row) => (row.startingPrice !== null ? formatMoney(row.startingPrice) : '—'),
  },
  { key: 'issues', label: 'Issues', render: (row) => row.issues.length },
  { key: 'isPopular', label: 'Popular', render: (row) => (row.isPopular ? 'Yes' : '—') },
  {
    key: 'isActive',
    label: 'Status',
    render: (row) => (
      <span className={`badge badge--${row.isActive ? 'success' : 'muted'}`}>
        {row.isActive ? 'Active' : 'Inactive'}
      </span>
    ),
  },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

function AdminServicesPage() {
  const page = Number(useQueryParam('page')) || 1;
  const isActive = useQueryParam('isActive') || '';
  const services = useApi(() => adminApi.services({ page, isActive: isActive || undefined }), [page, isActive]);

  function updateQuery(next) {
    const params = new URLSearchParams({ ...(isActive ? { isActive } : {}), page: '1', ...next });

    for (const [key, value] of [...params.entries()]) {
      if (!value) params.delete(key);
    }

    navigate(`/app/admin/services?${params.toString()}`, { replace: true });
  }

  return (
    <AdminShell>
      <div className="admin-content__header">
        <div>
          <h1 className="admin-content__title">Services</h1>
          <p className="admin-content__subtitle">The service catalogue customers can book from.</p>
        </div>
        <ButtonLink to="/app/admin/services/new" size="sm">
          New service
        </ButtonLink>
      </div>

      <div className="admin-filters">
        <Select
          id="isActiveFilter"
          label="Status"
          value={isActive}
          options={STATUS_OPTIONS}
          onChange={(event) => updateQuery({ isActive: event.target.value })}
        />
      </div>

      <AdminTable
        columns={COLUMNS}
        rows={services.data?.services || []}
        loading={services.loading}
        error={services.error}
        onRetry={services.reload}
        emptyTitle="No services found"
        emptyMessage="Create a service to get started."
        getRowHref={(row) => `/app/admin/services/${row.id}`}
      />

      {services.data ? (
        <AdminPagination
          page={services.data.page}
          totalPages={services.data.totalPages}
          total={services.data.total}
          onChange={(nextPage) => updateQuery({ page: String(nextPage) })}
        />
      ) : null}
    </AdminShell>
  );
}

export default AdminServicesPage;
