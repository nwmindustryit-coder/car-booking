import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ระบบจองรถ',
  description: 'ระบบจองรถ - Car Booking System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${inter.className} bg-blue-50 text-gray-800`}>
        <div className="min-h-screen flex flex-col">{children}</div>
      </body>
    </html>
  )
}
