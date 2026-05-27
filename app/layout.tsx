import './globals.css'
import { Inter } from 'next/font/google'
import ChatDrawer from '@/components/ChatDrawer'
import { AlertProvider } from '@/components/ui/alert-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ระบบจองรถ',
  description: 'ระบบจองรถ - Car Booking System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${inter.className} bg-blue-50 text-gray-800 dark:bg-slate-950 dark:text-slate-200 transition-colors duration-300`}>
        <AlertProvider>
          <div className="min-h-screen flex flex-col">{children}</div>
          <ChatDrawer />
        </AlertProvider>
      </body>
    </html>
  )
}
