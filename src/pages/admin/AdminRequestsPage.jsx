import { useTranslation } from 'react-i18next';
import AdminPagination from '../../components/admin/AdminPagination.jsx';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminTable from '../../components/admin/AdminTable.jsx';
import { Select } from '../../components/TextField.jsx';
import { PageHeader, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';
import { REQUEST_STATUSES, formatIssueLabel, formatTimestamp, statusLabel } from '../../utils/format.js';

// Column labels are i18n keys, translated at render.
const COLUMNS = [
  { key: 'customer', label: 'admin.fields.customer', render: (row) => row.customer?.name || '—' },
  { key: 'service', label: 'admin.fields.service', render: (row) => row.service?.name || '—' },
  { key: 'issueLabel', label: 'admin.fields.issue', render: (row) => formatIssueLabel(row.issueKey, row.issueLabel) || '—' },
  { key: 'status', label: 'admin.fields.status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'createdAt', label: 'admin.fields.created', render: (row) => formatTimestamp(row.createdAt) },
];

function AdminRequestsPage() {
  const { t } = useTranslation();
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

  const columns = COLUMNS.map((column) => ({
    ...column,
    label: t(column.label),
    render: column.render ? (row) => column.render(row, t) : undefined,
  }));
  const statusOptions = [
    { value: '', label: t('admin.shared.allStatuses') },
    ...REQUEST_STATUSES.map((value) => ({ value, label: statusLabel(value) })),
  ];

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
      <PageHeader title={t('common.adminNav.requests')} subtitle={t('admin.requests.subtitle')} />

      <div className="admin-filters">
        <Select
          id="statusFilter"
          label={t('admin.fields.status')}
          value={status}
          options={statusOptions}
          onChange={(event) => updateQuery({ status: event.target.value })}
        />
        <div className="field">
          <label htmlFor="searchFilter">{t('admin.requests.searchDescription')}</label>
          <div className="field-control">
            <input
              id="searchFilter"
              className="field-input"
              type="search"
              placeholder={t('admin.requests.searchPlaceholder')}
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
        columns={columns}
        rows={requests.data?.requests || []}
        loading={requests.loading}
        error={requests.error}
        onRetry={requests.reload}
        emptyTitle={t('admin.requests.emptyTitle')}
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
