import './globals.css'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'
import PlanProvider from '@/components/PlanProvider'
import AdSenseRails from '@/components/AdSenseRails'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const fontSans = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  metadataBase: new URL('https://inspectionreportmaker.com'),
  title: {
    default: 'Inspection Report Maker',
    template: '%s · Inspection Report Maker',
  },
  description:
    'Create, edit, and export professional inspection reports with photos.',
  applicationName: 'Inspection Report Maker',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
    shortcut: [{ url: '/favicon.ico' }],
  },
  openGraph: {
    title: 'Inspection Report Maker',
    description:
      'Create, edit, and export professional inspection reports with photos.',
    url: 'https://inspectionreportmaker.com',
    siteName: 'Inspection Report Maker',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inspection Report Maker',
    description:
      'Create, edit, and export professional inspection reports with photos.',
    images: ['/twitter-image.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {adsenseClient ? (
          <meta name="google-adsense-account" content={adsenseClient} />
        ) : null}
        {adsenseClient ? (
          <Script
            id="adsbygoogle-js"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body className={cn('min-h-screen bg-gray-50 text-gray-900', fontSans.variable)}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <PlanProvider>
            <AdSenseRails />
            <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
              <div className="flex-1 pb-12">{children}</div>
              <footer className="border-t pt-6 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-3">
                  <a href="/legal" className="hover:text-foreground">Legal & Policies</a>
                  <a href="/account" className="hover:text-foreground">Account</a>
                  <span className="ml-auto">
                    © {new Date().getFullYear()} Inspection Report Maker
                  </span>
                </div>
              </footer>
            </div>
            <Toaster />
          </PlanProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

