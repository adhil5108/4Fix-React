import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '../hooks/useRoute.js';
import { statusLabel, statusTone } from '../utils/format.js';

export function Link({ to, className, children, onClick, ...props }) {
  function handleClick(event) {
    onClick?.(event);

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
  const { t } = useTranslation();
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
      {loading ? loadingText || t('common.actions.pleaseWait') : children}
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
  // Subscribes to language changes so the translated label re-renders on switch.
  useTranslation();
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

export function LoadingState({ label }) {
  const { t } = useTranslation();
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label || t('common.states.loading')}</p>
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
  const { t } = useTranslation();
  const isNetwork = error?.code === 'NETWORK_ERROR';
  const isForbidden = error?.status === 403;
  const isMissing = error?.status === 404;

  let title = t('common.states.somethingWrong');
  if (isNetwork) title = t('common.states.offline');
  if (isForbidden) title = t('common.states.noAccess');
  if (isMissing) title = t('common.states.notFound');

  return (
    <div className="state state--error" role="alert">
      <p className="state__title">{title}</p>
      <p>{error?.message || t('common.states.pleaseTryAgain')}</p>
      {onRetry && !isForbidden && !isMissing ? (
        <div className="state__action">
          <Button variant="secondary" onClick={() => onRetry()}>
            {t('common.actions.tryAgain')}
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
  const { t } = useTranslation();
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
            {t('common.actions.goBack')}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
