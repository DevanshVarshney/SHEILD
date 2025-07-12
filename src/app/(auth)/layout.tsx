import type { ReactNode } from 'react';
import { ShieldIcon } from '@/components/icons';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <Link href="/" aria-label="Back to home">
          <ShieldIcon className="h-16 w-16 text-primary" />
        </Link>
        <h1 className="text-3xl font-bold tracking-tighter text-foreground font-headline">
          SHEILD
        </h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Smart Holistic Emergency & Intelligent Location Device
        </p>
      </div>
      {children}
    </main>
  );
}
