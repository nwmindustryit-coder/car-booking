import './globals.css'
import { Inter } from 'next/font/google'
import ChatDrawer from '@/components/ChatDrawer'
import { AlertProvider } from '@/components/ui/alert-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ระบบจองรถ',
  description: 'ระบบจองรถ - Car Booking System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Car Booking',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <meta name="theme-color" content="#2563eb" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className={`${inter.className} bg-blue-50 text-gray-800 dark:bg-slate-950 dark:text-slate-200 transition-colors duration-300`}>
        <AlertProvider>
          <div className="min-h-screen flex flex-col">{children}</div>
          <ChatDrawer />
        </AlertProvider>
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
