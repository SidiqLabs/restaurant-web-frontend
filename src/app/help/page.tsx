// src/app/help/page.tsx
import Link from 'next/link';

import { cn } from '@/lib/utils';

type SearchParams = Record<string, string | string[] | undefined>;

type HelpPageProps = {
  searchParams?: Promise<SearchParams>;
};

const topicTitleMap: Record<string, string> = {
  'how-to-order': 'How to Order',
  'payment-methods': 'Payment Methods',
  'track-my-order': 'Track My Order',
  faq: 'FAQ',
  'contact-us': 'Contact Us',
};

const getTopic = (searchParams: SearchParams | undefined) => {
  const raw = searchParams?.topic;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ?? 'faq';
};

export default async function HelpPage({ searchParams }: HelpPageProps) {
  const resolvedSearchParams = await searchParams;
  const topic = getTopic(resolvedSearchParams);
  const title = topicTitleMap[topic] ?? 'Help';

  return (
    <main className='mx-auto w-full max-w-360 px-6 pb-14 pt-10 lg:px-16 xl:px-30'>
      <div className='rounded-3xl border bg-card p-6 text-foreground shadow-sm'>
        <h1 className='text-2xl font-semibold'>{title}</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          This section is not available yet in the MVP. The links are live so
          the navigation flow is correct.
        </p>

        <div className='mt-6 flex flex-wrap items-center gap-3'>
          <Link
            href='/'
            className={cn(
              'rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground',
              'hover:opacity-90 transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            Back to Home
          </Link>

          <Link
            href='/orders'
            className={cn(
              'rounded-full border bg-background px-5 py-2 text-sm font-semibold text-foreground',
              'hover:bg-muted transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            Go to My Orders
          </Link>
        </div>
      </div>
    </main>
  );
}
