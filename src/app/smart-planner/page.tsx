import { redirect } from 'next/navigation';

export default function SmartPlannerRedirectPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const q = typeof searchParams?.q === 'string' ? searchParams.q : undefined;
  const plan = typeof searchParams?.plan === 'string' ? searchParams.plan : undefined;

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (plan) params.set('plan', plan);

  const qs = params.toString();
  redirect(qs ? `/ai?${qs}` : '/ai');
}
