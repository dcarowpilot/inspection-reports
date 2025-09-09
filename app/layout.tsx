// app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';



export const metadata: Metadata = {
  metadataBase: new URL('https://inspectionreportmaker.com'),
  title: {
    default: 'Inspection Report Maker',
    template: '%s · Inspection Report Maker',
  },
  description: 'Create, edit, and export professional inspection reports with photos.',
  applicationName: 'Inspection Report Maker',
  

  // These lines are optional if you’re using the file-based icons above,
  // but they let you be explicit (and add sizes/versioning if needed):
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/favicon.ico', type: 'image/x-icon' }, // if you add one
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' }, // optional extra sizes
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
    shortcut: [{ url: '/favicon.ico' }],
  },

  openGraph: {
    title: 'Inspection Report Maker',
    description: 'Create, edit, and export professional inspection reports with photos.',
    url: 'https://inspectionreportmaker.com',
    siteName: 'Inspection Report Maker',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inspection Report Maker',
    description: 'Create, edit, and export professional inspection reports with photos.',
    images: ['/twitter-image.png'],
  },

  
};

export const viewport: Viewport = {
  // one color
  themeColor: '#0ea5e9',
  // (optional) also fine to set these here:
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
  // or provide light/dark:
  // themeColor: [
  //   { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  //   { media: '(prefers-color-scheme: dark)',  color: '#0a0a0a' }
  // ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
