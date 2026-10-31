'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { useToast } from '@/components/site/ToastProvider';
import { NotificationItemView } from '@/components/notifications/NotificationItemView';
import {
  announceUnread,
  CATEGORY_LABELS,
  clearReadNotifications,
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationCategory,
  type NotificationItem,
} from '@/lib/notifications';

const PAGE_SIZE = 20;
type Filter = 'all' | 'unread';
const CATEGORIES = Object.keys(CATEGORY_LABELS) as NotificationCategory[];

export default function NotificationsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [category, setCategory] = useState<'' | NotificationCategory>('');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unread, setUnread] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [moreLoading, setMoreLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  // Notifications are private: guests are sent to log in.
  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      const id = ++requestId.current;
      if (replace) setStatus('loading');
      else setMoreLoading(true);
      const res = await fetchNotifications({ page: nextPage, limit: PAGE_SIZE, filter, category });
      if (id !== requestId.current) return; // a newer filter/page request superseded this one
      setMoreLoading(false);
      if (!res.ok || !res.data) {
        if (replace) setStatus('error');
        else showToast(res.message || 'और सूचनाएँ लोड नहीं हो सकीं।', true);
        return;
      }
      const data = res.data;
      setItems((prev) => (replace ? data.notifications : [...prev, ...data.notifications.filter((n) => !prev.some((p) => p._id === n._id))]));
      setPage(data.page);
      setHasMore(data.hasMore);
      setUnread(data.unreadCount);
      announceUnread(data.unreadCount);
      setStatus('ready');
    },
    [filter, category, showToast],
  );

  useEffect(() => {
    if (ready) load(1, true);
  }, [ready, load]);

  const setCounts = (n: number) => {
    setUnread(n);
    announceUnread(n);
  };

  const markRead = async (item: NotificationItem) => {
    if (item.read) return;
    setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
    setCounts(Math.max(0, unread - 1));
    const res = await markNotificationRead(item._id);
    if (res.ok && res.data) setCounts(res.data.unreadCount);
  };

  const remove = async (item: NotificationItem) => {
    const res = await deleteNotification(item._id);
    if (!res.ok) return showToast(res.message || 'सूचना हटाई नहीं जा सकी।', true);
    setItems((prev) => prev.filter((n) => n._id !== item._id));
    if (res.data) setCounts(res.data.unreadCount);
  };

  const readAll = async () => {
    if (busy || unread === 0) return;
    setBusy(true);
    const res = await markAllNotificationsRead();
    setBusy(false);
    if (!res.ok) return showToast(res.message || 'कुछ गड़बड़ हो गई।', true);
    setItems((prev) => (filter === 'unread' ? [] : prev.map((n) => ({ ...n, read: true }))));
    setCounts(0);
    showToast('सभी सूचनाएँ पढ़ी हुई चिह्नित हो गईं।');
  };

  const clearRead = async () => {
    if (busy) return;
    if (!window.confirm('सभी पढ़ी हुई सूचनाएँ हमेशा के लिए हटा दी जाएँगी। जारी रखें?')) return;
    setBusy(true);
    const res = await clearReadNotifications();
    setBusy(false);
    if (!res.ok) return showToast(res.message || 'कुछ गड़बड़ हो गई।', true);
    showToast('पढ़ी हुई सूचनाएँ हटा दी गईं।');
    load(1, true);
  };

  if (!ready) return null;

  return (
    <section className="mf-page">
      <div className="mehfil-container">
        <div className="ntf-page">
          <header className="ntf-hero">
            <span className="ntf-hero-icon" aria-hidden="true"><i className="fas fa-bell" /></span>
            <div className="ntf-hero-text">
              <h1>सूचनाएँ</h1>
              <p>
                {unread > 0 ? (
                  <><span className="ntf-count-pill">{unread > 99 ? '99+' : unread}</span> अपठित सूचनाएँ</>
                ) : (
                  'सब कुछ पढ़ा जा चुका है ✨'
                )}
              </p>
            </div>
            <div className="ntf-page-tools">
              <button type="button" className="ntf-tool" onClick={readAll} disabled={busy || unread === 0}>
                <i className="fas fa-check-double" aria-hidden="true" /> <span>सब पढ़ा हुआ करें</span>
              </button>
              <button type="button" className="ntf-tool" onClick={clearRead} disabled={busy}>
                <i className="fas fa-broom" aria-hidden="true" /> <span>पढ़ी हुई हटाएँ</span>
              </button>
            </div>
          </header>

          <div className="ntf-filters">
            <div className="ntf-tabs" role="tablist" aria-label="सूचनाएँ फ़िल्टर">
              {(['all', 'unread'] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filter === f}
                  className={`ntf-tab${filter === f ? ' active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'सभी' : 'अपठित'}
                </button>
              ))}
            </div>

            {/* Desktop / tablet: chips */}
            <div className="ntf-chips" role="group" aria-label="श्रेणी">
              <button type="button" className={`ntf-chip${category === '' ? ' active' : ''}`} onClick={() => setCategory('')}>
                सभी श्रेणियाँ
              </button>
              {CATEGORIES.map((c) => (
                <button key={c} type="button" className={`ntf-chip${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>

            {/* Phones: one compact dropdown instead of a wall of chips */}
            <div className="ntf-select-wrap">
              <label htmlFor="ntf-category" className="ntf-select-label">श्रेणी</label>
              <div className="ntf-select">
                <select id="ntf-category" value={category} onChange={(e) => setCategory(e.target.value as '' | NotificationCategory)}>
                  <option value="">सभी श्रेणियाँ</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
                <i className="fas fa-chevron-down" aria-hidden="true" />
              </div>
            </div>
          </div>

          {status === 'loading' && (
            <ul className="ntf-list" aria-busy="true" aria-label="लोड हो रहा है">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="ntf-item ntf-skeleton" aria-hidden="true" />
              ))}
            </ul>
          )}

          {status === 'error' && (
            <div className="ntf-state" role="alert">
              <i className="fas fa-exclamation-circle" aria-hidden="true" />
              <p>सूचनाएँ लोड नहीं हो सकीं।</p>
              <button type="button" className="primary-btn" onClick={() => load(1, true)}>फिर कोशिश करें</button>
            </div>
          )}

          {status === 'ready' && items.length === 0 && (
            <div className="ntf-state">
              <i className="far fa-bell-slash" aria-hidden="true" />
              <p>{filter === 'unread' ? 'कोई अपठित सूचना नहीं है।' : 'अभी कोई सूचना नहीं है।'}</p>
              <small>बैज, चयन, रचनाओं और खाते से जुड़ी सूचनाएँ यहाँ दिखेंगी।</small>
              <Link href="/poems" className="secondary-btn">कविताएँ पढ़ें</Link>
            </div>
          )}

          {status === 'ready' && items.length > 0 && (
            <>
              <ul className="ntf-list">
                {items.map((n) => (
                  <NotificationItemView
                    key={n._id}
                    item={n}
                    onOpen={markRead}
                    actions={
                      <>
                        {!n.read && (
                          <button type="button" className="ntf-act" onClick={() => markRead(n)} aria-label="पढ़ा हुआ चिह्नित करें" title="पढ़ा हुआ चिह्नित करें">
                            <i className="fas fa-check" aria-hidden="true" />
                          </button>
                        )}
                        <button type="button" className="ntf-act danger" onClick={() => remove(n)} aria-label="सूचना हटाएँ" title="हटाएँ">
                          <i className="fas fa-trash" aria-hidden="true" />
                        </button>
                      </>
                    }
                  />
                ))}
              </ul>
              {hasMore && (
                <div className="ntf-more">
                  <button type="button" className="secondary-btn" onClick={() => load(page + 1, false)} disabled={moreLoading}>
                    {moreLoading ? 'लोड हो रहा है…' : 'और दिखाएँ'}
                  </button>
                </div>
              )}
              <p className="ntf-note">सूचनाएँ 6 महीने बाद अपने-आप हट जाती हैं।</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
