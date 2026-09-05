export const metadata = {
  title: 'Sedori AI Web',
  description: 'Sedori AI Web Application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
