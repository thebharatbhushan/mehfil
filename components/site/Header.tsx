'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { myProfileHref } from '@/lib/auth';
import { MobileDrawer } from './MobileDrawer';

interface UserData {
  firstName?: string;
  lastName?: string;
  profilePic?: string;
  username?: string;
  email?: string;
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const avatarRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const readUser = () => {
      const stored =
        localStorage.getItem('mehfil_user') || sessionStorage.getItem('mehfil_user');
      if (!stored) {
        setUser(null);
        return;
      }
      try {
        setUser(JSON.parse(stored) as UserData);
      } catch {
        setUser(null);
      }
    };

    readUser();
    window.addEventListener('storage', readUser);
    window.addEventListener('mehfil-auth-change', readUser);
    return () => {
      window.removeEventListener('storage', readUser);
      window.removeEventListener('mehfil-auth-change', readUser);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setAvatarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 881px)');
    const onChange = () => mq.matches && setMenuOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handlePublish = () => {
    if (!user) {
      router.push('/login');
    } else {
      router.push('/publish');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mehfil_user');
    localStorage.removeItem('mehfil_remember');
    localStorage.removeItem('token');
    sessionStorage.removeItem('mehfil_user');
    setUser(null);
    window.dispatchEvent(new Event('mehfil-auth-change'));
    router.push('/');
  };

  const navLinks = [
    { href: '/', label: 'मुखपृष्ठ', active: pathname === '/' },
    { href: '/poems', label: 'कविताएँ', active: pathname.startsWith('/poems') || pathname.startsWith('/poem/') },
    { href: '/poets', label: 'रचनाकार', active: pathname.startsWith('/poets') || pathname.startsWith('/author') || pathname.startsWith('/u/') },
    { href: '/category', label: 'श्रेणियाँ', active: pathname.startsWith('/category') },
  ];

  return (
    <>
      <MobileDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        pathname={pathname}
        onPublish={handlePublish}
        onLogout={handleLogout}
        returnFocusTo={menuBtnRef}
      />
      <nav>
        <div className="mehfil-container nav-inner">
          <Link href="/" className="logo">
            <i className="fas fa-feather-alt" /> मेहफ़िल
          </Link>
          <div className="nav-links">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={link.active ? { color: 'var(--accent)' } : {}}
                aria-current={link.active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <Link href="/login">प्रवेश करें</Link>
            )}
          </div>
          <div className="nav-actions">
            <button className="nav-btn write-btn" onClick={handlePublish}>
              <i className="fas fa-pen-fancy" />
              <span>लेखन प्रारम्भ करें</span>
            </button>
            {user && (
              <div
                ref={avatarRef}
                className={`profile-avatar ${avatarOpen ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setAvatarOpen(!avatarOpen);
                }}
              >
                {user.profilePic ? (
                  <img
                    className="avatar-img"
                    src={user.profilePic}
                    alt={`${user.firstName || 'User'} profile`}
                  />
                ) : (
                  <span className="avatar-initial">
                    {(user.firstName || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="profile-dropdown">
                  <div className="user-greeting">
                    ✨ नमस्ते, {user.firstName}
                  </div>
                  <Link href={myProfileHref()} className="dropdown-item">
                    <i className="fas fa-user-circle" /> मेरी प्रोफ़ाइल
                  </Link>
                  <Link href="/profile#my-poems" className="dropdown-item">
                    <i className="fas fa-book-open" /> मेरी रचनाएँ
                  </Link>
                  <div className="dropdown-divider" />
                  <a
                    href="#"
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      handleLogout();
                    }}
                  >
                    <i className="fas fa-sign-out-alt" /> लॉग आउट
                  </a>
                </div>
              </div>
            )}
            <button
              ref={menuBtnRef}
              type="button"
              className="menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="मेन्यू खोलें"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
            >
              <i className="fas fa-bars" aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
