'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthorLoader, AuthorProfile } from '@/components/author/AuthorProfile';

// Legacy/fallback route: /author?id=<id> or /author?u=<username>. Redirects to /u/<username> once loaded.
function AuthorRoute() {
  const params = useSearchParams();
  return <AuthorProfile ident={params.get('u') || params.get('id')} />;
}

export default function AuthorPage() {
  return (
    <Suspense fallback={<AuthorLoader />}>
      <AuthorRoute />
    </Suspense>
  );
}
