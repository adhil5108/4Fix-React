import { navigate } from '../../hooks/useRoute.js';
import { EmptyState, ErrorState, LoadingState } from '../ui.jsx';

// A small, generic column-driven table. Each column is { key, label, render? }; render
// defaults to reading `row[key]`. Rows are optionally clickable via `getRowHref`.
function AdminTable({ columns, rows, loading, error, onRetry, emptyTitle, emptyMessage, getRowHref }) {
  if (loading) {
    return <LoadingState label="Loading…" />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (!rows.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = getRowHref?.(row);

            return (
              <tr
                key={row.id}
                className={href ? 'admin-table__row--link' : ''}
                tabIndex={href ? 0 : undefined}
                role={href ? 'link' : undefined}
                onClick={href ? () => navigate(href) : undefined}
                onKeyDown={
                  href
                    ? (event) => {
                        if (event.key === 'Enter') navigate(href);
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default AdminTable;
