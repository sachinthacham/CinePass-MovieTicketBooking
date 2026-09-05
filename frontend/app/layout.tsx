import type { Metadata } from 'next';
import { Fraunces, Bebas_Neue, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { QueryProvider } from '@/lib/providers/QueryProvider';

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['500', '600', '700', '900'],
});

const bebasNeue = Bebas_Neue({
  variable: '--font-bebas',
  subsets: ['latin'],
  weight: ['400'],
});

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'MovieTick - Premium Ticket Booking',
  description: 'Enterprise-level movie ticket booking platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${bebasNeue.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-(--background) text-(--foreground)">
        <QueryProvider>
          <ToastProvider>
            <Navbar />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
