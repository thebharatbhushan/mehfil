'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  announceUnread,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/lib/notifications';
import { NotificationItemView } from './NotificationItemView';

interface Props {
  unreadCount: number;
  onUnreadChange: (n: number) => void;
}

/** Header bell: unread badge + a dropdown with the latest notifications. Only rendered for signed-in members. */
export function NotificationBell({ unreadCount, onUnreadChange }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const load = useCallback(async () => {
    setState('loading');
    const res = await fetchNotifications({ limit: 8 });
    if (res.ok && res.data) {
      setItems(res.data.notifications);
      onUnreadChange(res.data.unreadCount);
      setState('idle');
    } else {
      setState('error');
    }
  }, [onUnreadChange]);

  // Fresh list every time the panel opens.
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = async (item: NotificationItem) => {
    setOpen(false);
    if (item.read) return;
    setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
    onUnreadChange(Math.max(0, unreadCount - 1));
    const res = await markNotificationRead(item._id);
    if (res.ok && res.data) announceUnread(res.data.unreadCount);
  };

  const readAll = async () => {
    const res = await markAllNotificationsRead();
    if (res.ok) {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      announceUnread(0);
    }
  };

  const label = unreadCount > 0 ? `सूचनाएँ, ${unreadCount} अपठित` : 'सूचनाएँ';

  return (
    <div className="ntf-wrap" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={`ntf-bell${open ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="ntf-panel"
      >
        <i className="fas fa-bell" aria-hidden="true" />
        {unreadCount > 0 && <span className={`ntf-badge${unreadCount > 99 ? ' wide' : unreadCount > 9 ? ' two' : ''}`}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div id="ntf-panel" className="ntf-panel" role="region" aria-label="सूचनाएँ">
          <div className="ntf-panel-head">
            <strong>सूचनाएँ</strong>
            <button type="button" className="ntf-link-btn" onClick={readAll} disabled={unreadCount === 0}>
              सब पढ़ा हुआ करें
            </button>
          </div>

          <div className="ntf-panel-body">
            {state === 'loading' && items.length === 0 && <p className="ntf-empty">लोड हो रहा है…</p>}
            {state === 'error' && (
              <p className="ntf-empty">
                सूचनाएँ लोड नहीं हो सकीं। <button type="button" className="ntf-link-btn" onClick={load}>फिर कोशिश करें</button>
              </p>
            )}
            {state === 'idle' && items.length === 0 && (
              <p className="ntf-empty">
                <i className="far fa-bell-slash" aria-hidden="true" /> अभी कोई सूचना नहीं है।
              </p>
            )}
            {items.length > 0 && (
              <ul className="ntf-list">
                {items.map((n) => (
                  <NotificationItemView key={n._id} item={n} onOpen={openItem} compact />
                ))}
              </ul>
            )}
          </div>

          <Link href="/notifications" className="ntf-panel-foot" onClick={() => setOpen(false)}>
            सभी सूचनाएँ देखें <i className="fas fa-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
