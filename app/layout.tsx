import './globals.css'
import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import Header from '@/components/header'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Next.js AI Chatbot', template: `%s - Next.js AI Chatbot` },
  description: 'An AI-powered chatbot template built with Next.js and Vercel.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Header />          {/* серверный — СВЕРХУ */}
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}