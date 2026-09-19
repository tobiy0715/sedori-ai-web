import './globals.css';

export const metadata = {
  title: 'せどりAI プロフェッショナル',
  description: 'リアルタイム商品分析ツール',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
