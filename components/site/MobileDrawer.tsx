'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { DEFAULT_AVATAR } from '@/lib/mehfil';
import { myProfileHref } from '@/lib/auth';

export interface DrawerUser {
  firstName?: string;
  lastName?: string;
  username?: string;
  profilePic?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  user: DrawerUser | null;
  pathname: string;
  onPublish: () => void;
  onLogout: () => void;
  /** The hamburger button; focus returns to it when the drawer closes. */
  returnFocusTo?: React.RefObject<HTMLElement>;
}

interface NavItem {
  href: string;
  label: string;
  sub: string;
  icon: string;
  active: boolean;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Right-hand slide-in navigation for phones / tablets (<= 880px; hidden by CSS on desktop, where the
 * normal nav bar is used). It only links to pages that exist in Mehfil.
 *
 * It is rendered outside the sticky <nav>: that element has a backdrop-filter, which would otherwise
 * become the containing block of this fixed-position panel.
 */
export function MobileDrawer({ open, onClose, user, pathname, onPublish, onLogout, returnFocusTo }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Escape closes; Tab is kept inside the panel while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const els = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock page scroll behind the drawer.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Move focus in on open, back to the hamburger on close.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      const t = setTimeout(() => closeRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      returnFocusTo?.current?.focus();
    }
  }, [open, returnFocusTo]);

  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'मेहफ़िल सदस्य' : '';

  const items: NavItem[] = [
    { href: '/', label: 'मुखपृष्ठ', sub: 'Home', icon: 'fa-home', active: pathname === '/' },
    { href: '/poems', label: 'कविताएँ', sub: 'Poems', icon: 'fa-book-open', active: pathname.startsWith('/poems') || pathname.startsWith('/poem/') },
    { href: '/poets', label: 'रचनाकार', sub: 'Authors', icon: 'fa-feather-alt', active: pathname.startsWith('/poets') || pathname.startsWith('/author') || pathname.startsWith('/u/') },
    { href: '/category', label: 'श्रेणियाँ', sub: 'Categories', icon: 'fa-th-large', active: pathname.startsWith('/category') },
    { href: '/about-contact', label: 'संपर्क करें', sub: 'About / Contact', icon: 'fa-envelope', active: pathname.startsWith('/about-contact') },
    { href: '/feedback', label: 'अपनी राय दें', sub: 'Feedback', icon: 'fa-comment-dots', active: pathname.startsWith('/feedback') },
  ];
  const mine: NavItem[] = user
    ? [
        { href: '/profile', label: 'मेरी प्रोफ़ाइल', sub: 'Profile', icon: 'fa-user-circle', active: pathname.startsWith('/profile') },
        { href: myProfileHref(), label: 'मेरी रचनाएँ', sub: 'My Rachna', icon: 'fa-pen-nib', active: false },
      ]
    : [];

  const renderItem = (item: NavItem) => (
    <li key={item.sub}>
      <Link
        href={item.href}
        className={`m-drawer-link${item.active ? ' active' : ''}`}
        aria-current={item.active ? 'page' : undefined}
        onClick={onClose}
      >
        <i className={`fas ${item.icon}`} aria-hidden="true" />
        <span className="m-drawer-link-text">
          {item.label}
          <small>{item.sub}</small>
        </span>
      </Link>
    </li>
  );

  return (
    <>
      <div className={`mobile-overlay${open ? ' active' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside
        id="mobile-drawer"
        ref={panelRef}
        className={`m-drawer${open ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="मुख्य मेन्यू"
        aria-hidden={!open}
      >
        <div className="m-drawer-head">
          <div className="m-drawer-top">
            <Link href="/" className="logo m-drawer-logo" onClick={onClose}>
              <i className="fas fa-feather-alt" aria-hidden="true" /> मेहफ़िल
            </Link>
            <button ref={closeRef} type="button" className="m-drawer-close" onClick={onClose} aria-label="मेन्यू बंद करें">
              <i className="fas fa-times" aria-hidden="true" />
            </button>
          </div>

          {user ? (
            <Link href="/profile" className="m-drawer-user" onClick={onClose}>
              <img
                className="m-drawer-avatar"
                src={user.profilePic || DEFAULT_AVATAR}
                alt={user.firstName ? `${user.firstName} profile` : 'Profile'}
                width={48}
                height={48}
                decoding="async"
                onError={(e) => {
                  if (e.currentTarget.src !== DEFAULT_AVATAR) e.currentTarget.src = DEFAULT_AVATAR;
                }}
              />
              <span className="m-drawer-user-text">
                <strong>{fullName}</strong>
                {user.username && <small>@{user.username}</small>}
              </span>
            </Link>
          ) : (
            <div className="m-drawer-guest">
              <Link href="/login" className="m-drawer-btn primary" onClick={onClose}>
                <i className="fas fa-sign-in-alt" aria-hidden="true" /> प्रवेश करें · Login
              </Link>
              <Link href="/signup" className="m-drawer-btn" onClick={onClose}>
                <i className="fas fa-user-plus" aria-hidden="true" /> खाता बनाएँ · Create Account
              </Link>
            </div>
          )}
        </div>

        <nav className="m-drawer-nav" aria-label="मोबाइल नेविगेशन">
          <ul>{items.map(renderItem)}</ul>
          <div className="m-drawer-sep" role="separator" />
          <ul>
            <li>
              <button
                type="button"
                className={`m-drawer-link${pathname.startsWith('/publish') ? ' active' : ''}`}
                onClick={() => {
                  onClose();
                  onPublish();
                }}
              >
                <i className="fas fa-pen-fancy" aria-hidden="true" />
                <span className="m-drawer-link-text">
                  रचना प्रकाशित करें
                  <small>Publish</small>
                </span>
              </button>
            </li>
            {mine.map(renderItem)}
          </ul>
        </nav>

        {user && (
          <div className="m-drawer-foot">
            <button type="button" className="m-drawer-link m-drawer-logout" onClick={onLogout}>
              <i className="fas fa-sign-out-alt" aria-hidden="true" />
              <span className="m-drawer-link-text">
                लॉग आउट
                <small>Log out</small>
              </span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
