import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'せどりAI プロフェッショナル',
  description: 'Keepa・セラースケット・poipoiのイイトコ取り',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* Tailwind CSS を直接読み込んでスタイル崩れを強制解決 */}
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body style={{ margin: 0, backgroundColor: '#020617' }}>
        {children}
      </body>
    </html>
  );
}
