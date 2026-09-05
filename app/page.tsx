import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const revalidate = 0

export default async function HomePage() {
  const { data: items, error } = await supabase
    .from('surging_items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main style={{ padding: '20px', textAlign: 'center', color: 'white', backgroundColor: '#0f172a', minHeight: '100vh' }}>
        <h2>データの読み込みに失敗しました</h2>
        <p>Supabaseの接続設定（環境変数）を確認してください。</p>
      </main>
    )
  }

  return (
    <main style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', padding: '16px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8', margin: '0 0 8px 0' }}>
            🔥 せどりAI 利益商品ダッシュボード
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            自動収集・AI解析されたリアルタイムデータ一覧
          </p>
        </header>

        <div style={{ display: 'grid', gap: '16px' }}>
          {items && items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid #334155'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ backgroundColor: '#f59e0b22', color: '#fbbf24', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                    【{item.ai_rank || 'A'}ランク】 スコア: {item.ai_score || 0}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    {item.category || 'カテゴリ指定なし'}
                  </span>
                </div>

                <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '8px 0', color: '#f1f5f9' }}>
                  {item.item_title}
                </h2>

                <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', margin: '12px 0' }}>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>仕入価格</span>
                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      ¥{item.ec_price?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#34d399', fontSize: '12px', display: 'block' }}>見込み利益</span>
                    <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '16px' }}>
                      +¥{item.estimated_profit?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>

                {item.analysis_reason && (
                  <p style={{ fontSize: '12px', color: '#cbd5e1', backgroundColor: '#334155', padding: '8px', borderRadius: '6px', margin: '0 0 12px 0' }}>
                    💡 {item.analysis_reason}
                  </p>
                )}

                {item.item_url && (
                  <a
                    href={item.item_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      backgroundColor: '#10b981',
                      color: 'white',
                      textDecoration: 'none',
                      padding: '10px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    仕入れ先ページを開く ↗
                  </a>
                )}
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
              データがまだありません。
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
