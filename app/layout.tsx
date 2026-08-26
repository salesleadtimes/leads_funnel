import { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/context/AuthContext';
import { LeadsProvider } from '../lib/context/LeadsContext';

export const metadata: Metadata = {
  title: 'Lead & Bid Manager — GeM · Government · Corporate',
  description: 'Multi-segment GeM and lead tracking management tool for Times IT Solutions bidding teams',
  icons: {
    icon: '/Logo-1.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased">
        <AuthProvider>
          <LeadsProvider>{children}</LeadsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
