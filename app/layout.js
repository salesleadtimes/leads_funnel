import './globals.css';

export const metadata = {
  title: 'HP Print & Scan — Sales Funnel',
  description: 'Government + Non-Government lead tracker and periodic sales review'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
