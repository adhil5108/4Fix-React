import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Inbox,
  Info,
  SearchX,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
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

function buttonClasses({ variant = 'primary', size, block, className = '' }) {
  return ['btn', `btn--${variant}`, size ? `btn--${size}` : '', block ? 'btn--block' : '', className]
    .filter(Boolean)
    .join(' ');
}

// `icon` is a lucide icon component shown before the label.
export function Button({
  ref,
  variant = 'primary',
  size,
  block = false,
  loading = false,
  loadingText,
  icon: Icon,
  className = '',
  disabled,
  children,
  type = 'button',
  ...props
}) {
  const { t } = useTranslation();

  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="spinner spinner--sm" aria-hidden="true" /> : Icon ? <Icon aria-hidden="true" /> : null}
      {loading ? loadingText || t('common.actions.pleaseWait') : children}
    </button>
  );
}

export function ButtonLink({ to, href, variant = 'primary', size, block = false, icon: Icon, className = '', children, ...props }) {
  const classes = buttonClasses({ variant, size, block, className });
  const content = (
    <>
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </>
  );

  return href ? (
    <a href={href} className={classes} {...props}>
      {content}
    </a>
  ) : (
    <Link to={to} className={classes} {...props}>
      {content}
    </Link>
  );
}

// Square 44px icon-only action. `label` is required: it is the accessible name.
export function IconButton({ icon: Icon, label, to, href, variant, className = '', children, ...props }) {
  const classes = ['icon-btn', variant ? `icon-btn--${variant}` : '', className].filter(Boolean).join(' ');
  const content = (
    <>
      <Icon aria-hidden="true" />
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={label} title={label} {...props}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} aria-label={label} title={label} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={classes} aria-label={label} title={label} {...props}>
      {content}
    </button>
  );
}

// `history`: go back in the browser history when there is somewhere to go back to
// (pages reached from several places), otherwise to `to`.
export function BackButton({ to, label, history = false }) {
  function handleClick(event) {
    if (history && window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  }

  return <IconButton icon={ArrowLeft} to={to} label={label} className="topbar__back" onClick={handleClick} />;
}

export function StatusBadge({ status, audience }) {
  // Subscribes to language changes so the translated label re-renders on switch.
  useTranslation();
  return <span className={`badge badge--${statusTone(status)}`}>{statusLabel(status, { audience })}</span>;
}

// Admin page header (the customer/provider app uses the AppShell top bar instead).
export function PageHeader({ title, subtitle, back, actions }) {
  return (
    <header className="page-header">
      {back ? (
        <Link to={back.to} className="page-header__back">
          <ArrowLeft aria-hidden="true" />
          {back.label}
        </Link>
      ) : null}
      <div className="page-header__row">
        <div className="page-header__text">
          <h1 className="page-header__title">{title}</h1>
          {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}

export function SectionHeader({ title, count, action, id }) {
  return (
    <div className="section-header">
      <h2 className="section-header__title" id={id}>
        {title}
        {count ? <span className="section-header__count">{count}</span> : null}
      </h2>
      {action}
    </div>
  );
}

export function ListGroup({ title, children, className = '' }) {
  return (
    <section className={className}>
      {title ? <h2 className="list-group__title">{title}</h2> : null}
      <div className="list-group">{children}</div>
    </section>
  );
}

// One row of a ListGroup. Becomes a link/button when given `to`, `href` or `onClick`.
export function ListRow({
  icon: Icon,
  leading,
  label,
  title,
  value,
  muted = false,
  trailing,
  chevron,
  danger = false,
  to,
  href,
  onClick,
  className = '',
  children,
  ...props
}) {
  const interactive = Boolean(to || href || onClick);
  const classes = [
    'list-row',
    interactive ? 'list-row--link' : '',
    danger ? 'list-row--danger' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const showChevron = chevron ?? Boolean(to);

  const content = (
    <>
      {leading ||
        (Icon ? (
          <span className="list-row__icon" aria-hidden="true">
            <Icon />
          </span>
        ) : null)}
      <span className="list-row__body">
        {label ? <span className="list-row__label">{label}</span> : null}
        {title ? <span className="list-row__title">{title}</span> : null}
        {value !== undefined && value !== null && value !== '' ? (
          <span className={`list-row__value${muted ? ' is-muted' : ''}`}>{value}</span>
        ) : null}
        {children}
      </span>
      {trailing || showChevron ? (
        <span className="list-row__trail">
          {trailing}
          {showChevron ? <ChevronRight aria-hidden="true" /> : null}
        </span>
      ) : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} {...props}>
        {content}
      </button>
    );
  }

  return (
    <div className={classes} {...props}>
      {content}
    </div>
  );
}

export function LoadingState({ label }) {
  const { t } = useTranslation();

  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p className="state__text">{label || t('common.states.loading')}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="state state--empty">
      <span className="state__icon" aria-hidden="true">
        <Icon />
      </span>
      <p className="state__title">{title}</p>
      {message ? <p className="state__text">{message}</p> : null}
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
  let Icon = CircleAlert;
  if (isNetwork) {
    title = t('common.states.offline');
    Icon = WifiOff;
  }
  if (isForbidden) {
    title = t('common.states.noAccess');
    Icon = ShieldAlert;
  }
  if (isMissing) {
    title = t('common.states.notFound');
    Icon = SearchX;
  }

  return (
    <div className="state state--error" role="alert">
      <span className="state__icon" aria-hidden="true">
        <Icon />
      </span>
      <p className="state__title">{title}</p>
      <p className="state__text">{error?.message || t('common.states.pleaseTryAgain')}</p>
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

const NOTICE_ICONS = { error: CircleAlert, success: CircleCheck, info: Info };

export function Notice({ tone = 'error', children }) {
  if (!children) {
    return null;
  }

  const Icon = NOTICE_ICONS[tone] || Info;

  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Card({ as: Element = 'section', className = '', tint = false, children, ...props }) {
  return (
    <Element className={['card', tint ? 'card--tint' : '', className].filter(Boolean).join(' ')} {...props}>
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

// Fixed action area above the bottom navigation (or the screen edge when the page hides
// the navigation). The page must render inside <AppShell bar>.
export function StickyActionBar({ children, note }) {
  return (
    <div className="sticky-bar">
      <div className="sticky-bar__inner">
        {children}
        {note ? <p className="sticky-bar__note">{note}</p> : null}
      </div>
    </div>
  );
}

// Two-to-four way switch (tabs on a list page).
export function SegmentedTabs({ items, value, onChange, label }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={value === item.key}
          className={`segmented__item${value === item.key ? ' is-active' : ''}`}
          onClick={() => onChange(item.key)}
        >
          {item.label}
          {item.count !== undefined ? <span className="segmented__count">{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

function useSheetBehaviour(open, onClose, busy, initialFocusRef) {
  const latest = useRef({ busy, onClose });
  latest.current = { busy, onClose };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previouslyFocused = document.activeElement;
    initialFocusRef?.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !latest.current.busy) {
        latest.current.onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [open]);
}

// Bottom sheet for secondary content (notes, sharing). Closes on backdrop/Escape.
export function Sheet({ open, title, onClose, children, labelledBy = 'sheet-title' }) {
  const panelRef = useRef(null);
  useSheetBehaviour(open, onClose, false, panelRef);

  if (!open) {
    return null;
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet__handle" aria-hidden="true" />
        <h2 id={labelledBy} className="sheet__title">
          {title}
        </h2>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
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
  useSheetBehaviour(open, onCancel, busy, cancelRef);

  if (!open) {
    return null;
  }

  return (
    <div className="sheet-backdrop" onClick={() => !busy && onCancel()}>
      <div
        className="sheet"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet__handle" aria-hidden="true" />
        <h2 id="dialog-title" className="sheet__title">
          {title}
        </h2>
        <p id="dialog-message" className="sheet__text">
          {message}
        </p>
        <div className="sheet__actions">
          <Button ref={cancelRef} variant="secondary" size="lg" onClick={onCancel} disabled={busy}>
            {t('common.actions.goBack')}
          </Button>
          <Button variant={confirmVariant} size="lg" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
