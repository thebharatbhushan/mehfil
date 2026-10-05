'use client';

import { useParams } from 'next/navigation';
import { AuthorProfile } from '@/components/author/AuthorProfile';

// Public author profile at /u/<username>
export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  let name = String(params?.username || '');
  try { name = decodeURIComponent(name); } catch { /* keep raw */ }
  return <AuthorProfile ident={name.replace(/^@/, '').toLowerCase()} />;
}
