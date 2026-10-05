'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCurrentUserId, getStoredUser, myProfileHref } from '@/lib/auth';

interface Item {
  href: string;
  label: string;
  sub: string;
  icon: string;
  match: (path: string) => boolean;
  center?: boolean;
}

// Routes where a fixed bar would get in the way (auth forms, the publish editor).
const HIDDEN_ON = ['/login', '/signup', '/publish'];

export function BottomNav() {
  const pathname = usePathname() || '/';
  const [loggedIn, setLoggedIn] = useState(false);
  // True while viewing the logged-in user's own author page (/author?id=<me>, or /author with no id).
  const [ownProfile, setOwnProfile] = useState(false);

  useEffect(() => {
    if (pathname.startsWith('/u/')) {
      const me = getStoredUser()?.username;
      const viewed = decodeURIComponent(pathname.slice(3)).replace(/^@/, '').toLowerCase();
      setOwnProfile(!!me && String(me).toLowerCase() === viewed);
      return;
    }
    if (!pathname.startsWith('/author')) {
      setOwnProfile(false);
      return;
    }
    const id = new URLSearchParams(window.location.search).get('id');
    setOwnProfile(!id || id === getCurrentUserId());
  }, [pathname, loggedIn]);

  useEffect(() => {
    const read = () =>
      setLoggedIn(!!(localStorage.getItem('mehfil_user') || sessionStorage.getItem('mehfil_user')));
    read();
    window.addEventListener('storage', read);
    window.addEventListener('mehfil-auth-change', read);
    return () => {
      window.removeEventListener('storage', read);
      window.removeEventListener('mehfil-auth-change', read);
    };
  }, []);

  const hidden = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Tell the stylesheet to reserve room under the page content only while the bar is shown.
  useEffect(() => {
    document.body.classList.toggle('has-bottom-nav', !hidden);
    return () => document.body.classList.remove('has-bottom-nav');
  }, [hidden]);

  if (hidden) return null;

  // Same rule as the header's write button: guests are sent to log in first.
  const items: Item[] = [
    { href: '/', label: 'मुखपृष्ठ', sub: 'Home', icon: 'fa-home', match: (p) => p === '/' },
    { href: '/poems', label: 'कविताएँ', sub: 'Poems', icon: 'fa-book-open', match: (p) => p.startsWith('/poems') || p.startsWith('/poem/') },
    // Raised centre action, same behaviour as the header's write button
    { href: loggedIn ? '/publish' : '/login', label: 'लिखें', sub: 'Write', icon: 'fa-pen-fancy', match: () => false, center: true },
    { href: '/poets', label: 'शायर', sub: 'Authors', icon: 'fa-feather-alt', match: (p) => p.startsWith('/poets') || ((p.startsWith('/author') || p.startsWith('/u/')) && !ownProfile) },
    loggedIn
      ? { href: myProfileHref(), label: 'प्रोफ़ाइल', sub: 'Profile', icon: 'fa-user-circle', match: (p) => p.startsWith('/profile') || ownProfile }
      : { href: '/login', label: 'प्रवेश', sub: 'Login', icon: 'fa-sign-in-alt', match: (p) => p.startsWith('/login') },
  ];

  return (
    <nav className="bottom-nav" aria-label="मुख्य नेविगेशन">
      <ul className="bottom-nav-list">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.sub}>
              <Link
                href={item.href}
                className={`bottom-nav-item${item.center ? ' bottom-nav-fab' : ''}${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label={`${item.label} (${item.sub})`}
              >
                {item.center ? (
                  <span className="fab-circle"><i className={`fas ${item.icon}`} aria-hidden="true" /></span>
                ) : (
                  <i className={`fas ${item.icon}`} aria-hidden="true" />
                )}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
