import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { DataProvider } from '@/lib/store'
import { WorkforceProvider } from '@/lib/workforce-store'
import './globals.css'

export const metadata: Metadata = {
  title: '인건비 시뮬레이터 · 인상률 배분 계획',
  description: '조직 기초 데이터 기반 인건비 및 급여 시뮬레이션 도구',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className="bg-background">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <DataProvider>
          <WorkforceProvider>{children}</WorkforceProvider>
        </DataProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
