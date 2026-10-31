'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';

/**
 * Footer "Become a Member" link.
 * Uses the app's existing auth source (lib/auth → the stored token): logged-in users go straight to
 * their profile, everyone else goes to signup. The check runs at click time, so it is always correct
 * after a refresh or a login/logout without needing extra state. The href stays a real link
 * (/signup) for crawlers and "open in new tab".
 */
export function BecomeMemberLink({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  return (
    <Link
      href="/signup"
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        if (getToken()) {
          event.preventDefault();
          router.push('/profile');
        }
      }}
    >
      {children}
    </Link>
  );
}
