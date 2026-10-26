import type {Metadata} from 'next';
import {Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono} from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Ferrum Architecture Explorer',
  description:
    'Interactive 5-layer system architecture explorer, topology repair workbench, and step-by-step voice command flow simulator for the Ferrum Python assistant.',
  openGraph: {
    title: 'Ferrum Architecture Explorer',
    description:
      'Interactive 5-layer system architecture explorer, topology repair workbench, and step-by-step voice command flow simulator for the Ferrum Python assistant.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ferrum Architecture Explorer',
    description:
      'Interactive 5-layer system architecture explorer, topology repair workbench, and step-by-step voice command flow simulator for the Ferrum Python assistant.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-sky-600 selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}
