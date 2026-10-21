/**
 * Notifications API client + small helpers shared by the header bell, the mobile drawer and /notifications.
 * The backend decides what a member is notified about; this file only reads and updates their own inbox.
 */
import { API_BASE_URL } from '@/lib/mehfil';
import { getToken } from '@/lib/auth';

export type NotificationCategory = 'account' | 'achievement' | 'poem' | 'moderation' | 'support' | 'system';

export interface NotificationItem {
  _id: string;
  type: string;
  category: NotificationCategory;
  priority: 'normal' | 'high';
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationPage {
  notifications: NotificationItem[];
  unreadCount: number;
  page: number;
  hasMore: boolean;
  total: number;
}

/** Fired after any change so the bell, the drawer and the page stay in sync: detail = { unreadCount }. */
export const NOTIFICATIONS_CHANGED = 'mehfil-notifications-change';

export function announceUnread(unreadCount: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED, { detail: { unreadCount } }));
}

/* ----------------------------- device id (login alerts) ----------------------------- */

const DEVICE_KEY = 'mehfil_device_id';

/**
 * A random id created once per browser. It is sent when logging in so the server can tell "a browser you have used
 * before" from "a new device" and send a security notification. It identifies nothing about the person.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (id && /^[A-Za-z0-9_-]{8,80}$/.test(id)) return id;
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return '';
  }
}

/** Extra headers for login / signup-verification requests. */
export function deviceHeaders(): Record<string, string> {
  const id = getDeviceId();
  return id ? { 'X-Device-Id': id } : {};
}

/* --------------------------------------- API --------------------------------------- */

interface Result<T> {
  ok: boolean;
  status: number;
  data?: T;
  message?: string;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<Result<T>> {
  const token = getToken();
  if (!token) return { ok: false, status: 401, message: 'login required' };
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) {
      return { ok: false, status: res.status, message: body.message || 'कुछ गड़बड़ हो गई।' };
    }
    return { ok: true, status: res.status, data: body as T };
  } catch {
    return { ok: false, status: 0, message: 'सर्वर से कनेक्ट नहीं हो सका।' };
  }
}

export const fetchNotifications = (opts: { page?: number; limit?: number; filter?: 'all' | 'unread'; category?: string } = {}) => {
  const qs = new URLSearchParams();
  qs.set('page', String(opts.page ?? 1));
  qs.set('limit', String(opts.limit ?? 20));
  if (opts.filter === 'unread') qs.set('filter', 'unread');
  if (opts.category) qs.set('category', opts.category);
  return call<NotificationPage>(`?${qs.toString()}`);
};

export const fetchUnreadCount = () => call<{ unreadCount: number }>('/unread-count');
export const markNotificationRead = (id: string) =>
  call<{ unreadCount: number }>(`/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = () => call<{ unreadCount: number }>('/read-all', { method: 'POST' });
export const deleteNotification = (id: string) =>
  call<{ unreadCount: number }>(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const clearReadNotifications = () => call<{ removed: number; unreadCount: number }>('?scope=read', { method: 'DELETE' });

/* ------------------------------------- display ------------------------------------- */

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  account: 'खाता',
  achievement: 'उपलब्धियाँ',
  poem: 'कविताएँ',
  moderation: 'मॉडरेशन',
  support: 'सहायता',
  system: 'मेहफ़िल की सूचना',
};

const TYPE_ICONS: Record<string, string> = {
  welcome: 'fa-hand-holding-heart',
  password_changed: 'fa-key',
  new_device_login: 'fa-laptop',
  account_restored: 'fa-user-check',
  badge_unlocked: 'fa-medal',
  achievement: 'fa-trophy',
  first_poem: 'fa-feather-alt',
  featured_writer: 'fa-star',
  weekly_writer: 'fa-crown',
  featured_poem: 'fa-award',
  poem_rejected: 'fa-times-circle',
  poem_unpublished: 'fa-eye-slash',
  poem_restored: 'fa-undo',
  copyright_report: 'fa-copyright',
  report_action: 'fa-flag-checkered',
  moderation_notice: 'fa-gavel',
  support_reply: 'fa-reply',
  feedback_status: 'fa-comment-dots',
  system_update: 'fa-sync-alt',
  maintenance: 'fa-tools',
  feature_launch: 'fa-rocket',
  policy_update: 'fa-file-contract',
  announcement: 'fa-bullhorn',
};

const CATEGORY_ICONS: Record<NotificationCategory, string> = {
  account: 'fa-user-shield',
  achievement: 'fa-trophy',
  poem: 'fa-book-open',
  moderation: 'fa-gavel',
  support: 'fa-life-ring',
  system: 'fa-bullhorn',
};

export function iconFor(n: Pick<NotificationItem, 'type' | 'category'>): string {
  return TYPE_ICONS[n.type] || CATEGORY_ICONS[n.category] || 'fa-bell';
}

/** "अभी", "5 मिनट पहले", "2 घंटे पहले", "कल", else the date. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const sec = Math.max(0, Math.floor((now - t) / 1000));
  if (sec < 45) return 'अभी';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min || 1} मिनट पहले`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} घंटे पहले`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'कल';
  if (day < 7) return `${day} दिन पहले`;
  return new Date(t).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Same-site path => in-app navigation; http(s) URL => external; anything else is not a link. */
export function linkKind(link: string): 'internal' | 'external' | 'none' {
  if (!link) return 'none';
  if (link.startsWith('/') && !link.startsWith('//')) return 'internal';
  return /^https?:\/\//i.test(link) ? 'external' : 'none';
}
