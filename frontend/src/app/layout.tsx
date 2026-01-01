import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KeyLevels AI - Stock Key Levels Analysis',
  description: 'Identify key support and resistance levels with AI-powered analysis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
