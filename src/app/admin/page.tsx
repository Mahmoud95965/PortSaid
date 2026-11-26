import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/AdminDashboard';
import { getAdminSession } from '@/lib/auth/requireAdmin';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'لوحة التحكم | Port Said Hub',
  description: 'لوحة التحكم الإدارية لـ Port Said Hub',
};

/**
 * Server-side gate: the admin area is accessible ONLY to the single admin
 * account (portsaidhub@gmail.com). Anyone else — visitor, logged-out user,
 * or any non-admin account — is redirected to the homepage before any
 * admin component or data is rendered. The client-side guard inside
 * AdminDashboard is cosmetic defense-in-depth only.
 */
export default async function AdminPage() {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    redirect('/');
  }
  return <AdminDashboard />;
}
