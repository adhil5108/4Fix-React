import { useEffect, useRef } from 'react';
import { navigate } from '../hooks/useRoute.js';
import { statusLabel, statusTone } from '../utils/format.js';

export function Link({ to, className, children, ...props }) {
  function handleClick(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    navigate(to);
  }

  return (
    <a href={to} className={className} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}

export function Button({
  ref,
  variant = 'primary',
  size,
  block = false,
  loading = false,
  loadingText,
  className = '',
  disabled,
  children,
  type = 'button',
  ...props
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size ? `btn--${size}` : '',
    block ? 'btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} {...props}>
      {loading ? loadingText || 'Please wait…' : children}
    </button>
  );
}

export function ButtonLink({ to, variant = 'primary', size, block = false, className = '', children }) {
  const classes = ['btn', `btn--${variant}`, size ? `btn--${size}` : '', block ? 'btn--block' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <Link to={to} className={classes}>
      {children}
    </Link>
  );
}

export function StatusBadge({ status, audience }) {
  return (
    <span className={`badge badge--${statusTone(status)}`}>{statusLabel(status, { audience })}</span>
  );
}

export function PageHeader({ title, subtitle, back, actions }) {
  return (
    <header className="page-header">
      {back ? (
        <Link to={back.to} className="back-link">
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      ) : null}
      <div className="page-header__row">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="state state--empty">
      <p className="state__title">{title}</p>
      {message ? <p>{message}</p> : null}
      {action ? <div className="state__action">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const isNetwork = error?.code === 'NETWORK_ERROR';
  const isForbidden = error?.status === 403;
  const isMissing = error?.status === 404;

  let title = 'Something went wrong';
  if (isNetwork) title = 'You appear to be offline';
  if (isForbidden) title = 'You don’t have access to this';
  if (isMissing) title = 'Not found';

  return (
    <div className="state state--error" role="alert">
      <p className="state__title">{title}</p>
      <p>{error?.message || 'Please try again.'}</p>
      {onRetry && !isForbidden && !isMissing ? (
        <div className="state__action">
          <Button variant="secondary" onClick={() => onRetry()}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function Notice({ tone = 'error', children }) {
  if (!children) {
    return null;
  }

  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function Card({ as: Element = 'section', className = '', children, ...props }) {
  return (
    <Element className={`card ${className}`.trim()} {...props}>
      {children}
    </Element>
  );
}

export function DetailList({ items }) {
  const visibleItems = items.filter((item) => item.value);

  return (
    <dl className="detail-list">
      {visibleItems.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);
  const latest = useRef({ busy, onCancel });
  latest.current = { busy, onCancel };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previouslyFocused = document.activeElement;
    cancelRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !latest.current.busy) {
        latest.current.onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" onClick={() => !busy && onCancel()}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="dialog-title">{title}</h2>
        <p id="dialog-message">{message}</p>
        <div className="dialog__actions">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
            Go back
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
