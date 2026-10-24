import { AdminDashboard } from '@/components/AdminDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'لوحة التحكم | Port Said Hub',
  description: 'لوحة التحكم الإدارية لـ Port Said Hub',
};

export default function AdminPage() {
  return <AdminDashboard />;
}
