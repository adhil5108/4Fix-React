import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, House, Inbox, Menu, MessageCircle, User, Wrench } from 'lucide-react';
import AreaSwitcher from './admin/AreaSwitcher.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useUnread } from '../hooks/useUnread.jsx';
import { useRoute } from '../hooks/useRoute.js';
import { BackButton, Link } from './ui.jsx';
import { NavBadge, UnreadToasts } from './Unread.jsx';

const isChatPath = (path) => /^\/bookings\/[^/]+\/chat$/.test(path);

// Bottom navigation per side. `label` is a key under common.navShort; `unread` marks the
// tab that carries the unread-chat count; `match` decides the active tab.
const NAV_BY_SIDE = {
  // Customers never sign in: everyone who isn't a provider sees this navigation.
  CUSTOMER: [
    { to: '/', label: 'home', icon: House, match: (path) => path === '/' || path.startsWith('/services') || path.startsWith('/categories') || path.startsWith('/book/') },
    { to: '/requests', label: 'myRequests', icon: ClipboardList, match: (path) => path.startsWith('/requests') || (path.startsWith('/bookings/') && !isChatPath(path)) },
    { to: '/chats', label: 'chat', icon: MessageCircle, unread: true, match: (path) => path === '/chats' || isChatPath(path) },
    { to: '/more', label: 'more', icon: Menu, match: (path) => path === '/more' || path === '/about' },
  ],
  PROVIDER: [
    { to: '/provider', label: 'home', icon: House, match: (path) => path === '/provider' },
    { to: '/provider/requests', label: 'requests', icon: Inbox, match: (path) => path.startsWith('/provider/requests') },
    { to: '/provider/jobs', label: 'jobs', icon: Wrench, match: (path) => path.startsWith('/provider/jobs') || (path.startsWith('/bookings/') && !isChatPath(path)) },
    { to: '/provider/chats', label: 'chat', icon: MessageCircle, unread: true, match: (path) => path === '/provider/chats' || isChatPath(path) },
    { to: '/provider/profile', label: 'profile', icon: User, match: (path) => path === '/provider/profile' },
  ],
};

function BottomNav({ items, path, unreadTotal }) {
  const { t } = useTranslation();

  return (
    <nav className="bottom-nav" aria-label={t('common.nav.main')}>
      <div className="bottom-nav__inner">
        {items.map((item) => {
          const active = item.match(path);
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`bottom-nav__item${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="bottom-nav__icon">
                <Icon aria-hidden="true" />
                {item.unread ? <NavBadge count={unreadTotal} /> : null}
              </span>
              <span className="bottom-nav__label">{t(`common.navShort.${item.label}`)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// A fixed action bar covers the bottom of the screen, and browsers treat a field hidden
// behind it as "already in view". Keep the focused field clear of the bar — on focus and
// again when the on-screen keyboard resizes the viewport.
function useKeepFocusAboveBar(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    function reveal() {
      const field = document.activeElement;
      const bar = document.querySelector('.sticky-bar');
      if (!bar || !field?.matches?.('input, textarea, select')) return;
      const fieldBottom = field.getBoundingClientRect().bottom;
      const barTop = bar.getBoundingClientRect().top;
      if (fieldBottom > barTop - 12) {
        window.scrollBy({ top: fieldBottom - barTop + 24, behavior: 'smooth' });
      }
    }

    const onFocus = () => window.setTimeout(reveal, 60);
    document.addEventListener('focusin', onFocus);
    window.visualViewport?.addEventListener('resize', onFocus);
    return () => {
      document.removeEventListener('focusin', onFocus);
      window.visualViewport?.removeEventListener('resize', onFocus);
    };
  }, [enabled]);
}

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return scrolled;
}

// The one mobile top bar. Three looks:
//   brand  — 4Fix wordmark (Home)
//   large  — a big title with no back button (root tabs)
//   default — back button + title (everything else)
export function TopBar({ title, back, actions, large = false, brand = false, bordered = false }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const scrolled = useScrolled();
  const homeTarget = user?.role === 'PROVIDER' ? '/provider' : '/';

  return (
    <header
      className={['topbar', large ? 'topbar--large' : '', bordered ? 'topbar--bordered' : '', scrolled ? 'is-scrolled' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="topbar__inner">
        {back ? <BackButton to={back.to} label={back.label || t('common.actions.goBack')} history={back.history} /> : null}
        {brand ? (
          <Link to={homeTarget} className="topbar__brand" aria-label={t('common.brand.homeAria')}>
            <span className="brand-mark">4</span>Fix
          </Link>
        ) : (
          <h1 className="topbar__title">{title}</h1>
        )}
        {actions ? <div className="topbar__actions">{actions}</div> : null}
      </div>
    </header>
  );
}

// Which side's navigation to show: providers get theirs; an ADMIN browsing the app is
// previewing a side (inferred from the path); everyone else is an anonymous customer.
function resolveSide(user, path) {
  if (user?.role === 'PROVIDER') return 'PROVIDER';
  if (user?.role === 'ADMIN') return path === '/provider' || path.startsWith('/provider/') ? 'PROVIDER' : 'CUSTOMER';
  return 'CUSTOMER';
}

// Customer/provider layout. Phone-first: a single column, a top bar, and the bottom
// navigation (hidden on task screens — forms, chat — with `nav={false}`). `bar` reserves
// room for a <StickyActionBar> rendered by the page.
function AppShell({ children, title, back, actions, large = false, brand = false, nav = true, bar = false }) {
  const { path } = useRoute();
  const { user } = useAuth();
  const side = resolveSide(user, path);
  const previewSide = user?.role === 'ADMIN' ? side : null;
  // Admin (previewing) never has unread chats: it is not a participant.
  const { total: unreadTotal } = useUnread();
  const { t } = useTranslation();
  useKeepFocusAboveBar(bar);

  return (
    <div className={['app', nav ? '' : 'app--no-nav', bar ? 'app--with-bar' : ''].filter(Boolean).join(' ')}>
      <TopBar title={title} back={back} actions={actions} large={large} brand={brand} />
      {previewSide ? (
        <div className="preview-banner">
          <span className="preview-banner__label">
            {t('common.areas.previewBanner', {
              side: t(previewSide === 'PROVIDER' ? 'common.areas.providerSide' : 'common.areas.customerSide'),
            })}
          </span>
          <AreaSwitcher current={previewSide} className="preview-banner__areas" linkClassName="chip" />
        </div>
      ) : null}
      <main className="app__main">{children}</main>
      {nav ? <BottomNav items={NAV_BY_SIDE[side]} path={path} unreadTotal={unreadTotal} /> : null}
      <UnreadToasts />
    </div>
  );
}

export default AppShell;
