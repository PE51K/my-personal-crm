/**
 * Main layout component with header
 */

import { Header } from './Header';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps): ReactNode {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto py-8 px-8">
        {children}
      </main>
    </div>
  );
}
