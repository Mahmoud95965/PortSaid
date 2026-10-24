import { redirect } from 'next/navigation';

export default function ChatRedirectPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const q = typeof searchParams?.q === 'string' ? searchParams.q : undefined;
  redirect(q ? `/ai?tab=chat&q=${encodeURIComponent(q)}` : '/ai?tab=chat');
}
