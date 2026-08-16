import './globals.css';
import { AuthProvider } from '../lib/context/AuthContext';
import { LeadsProvider } from '../lib/context/LeadsContext';

export const metadata = {
  title: 'Lead & Bid Manager — GeM · Government · Corporate',
  description: 'Multi-segment GeM and lead tracking management tool for GEM bidding teams',
  icons: {
    icon: '/Logo-1.png'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LeadsProvider>
            {children}
          </LeadsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
