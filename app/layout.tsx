import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'QR Manager',
  description: 'Plataforma de geração e gestão de QR Codes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a' }}>
        {children}
      </body>
    </html>
  )
}
