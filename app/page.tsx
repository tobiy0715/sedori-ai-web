'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type Item = {
  id: number
  created_at?: string
  item_title: string
  category: string
  purchase_price: number
  expected_profit: number
  score: number
  rank: string
  ai_comment: string
  url: string
}

function formatDate(dateString?: string) {
  if (!dateString) return '日時未設定'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return '日時エラー'
    
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    
    return `${month}/${day} ${hours}:${minutes}`
  } catch (e) {
    return '日時エラー'
  }
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([])

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('surging_items')
      .select('*')
      .order('id', { ascending: false })
      
    if (data) {
      setItems(data)
    }
  }

  useEffect(() => {
    fetchItems()

    const channel = supabase
      .channel('realtime-surging_items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'surging_items' },
        () => {
          fetchItems()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <main 
      style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0f172a', 
        color: '#f8fafc',
        padding: '16px',
        fontFamily: 'sans-serif'
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔥 せどりAI 利益商品ダッシュボード
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
            自動収集・AI解析されたリアルタイムデータ一覧（自動更新有効）
          </p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* バッジ & 日時・カテゴリ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}>
                  【{item.rank}ランク】 スコア: {item.score}
                </span>

                <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
                  <span style={{ backgroundColor: '#0f172a', color: '#cbd5e1', padding: '3px 8px', borderRadius: '4px', border: '1px solid #334155' }}>
                    🕒 {formatDate(item.created_at)}
                  </span>
                  <span style={{ backgroundColor: '#0f172a', color: '#cbd5e1', padding: '3px 8px', borderRadius: '4px', border: '1px solid #334155' }}>
                    {item.category || 'その他'}
                  </span>
                </div>
              </div>

              {/* タイトル */}
              <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: '#f1f5f9', lineHeight: '1.4', margin: 0 }}>
                {item.item_title}
              </h2>

              {/* 価格（2列レイアウト） */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                backgroundColor: '#0f172a',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #334155'
              }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '2px' }}>仕入価格</span>
                  <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#f8fafc' }}>
                    ¥{item.purchase_price?.toLocaleString() || 0}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '2px' }}>見込み利益</span>
                  <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#34d399' }}>
                    +¥{item.expected_profit?.toLocaleString() || 0}
                  </span>
                </div>
              </div>

              {/* AIコメント */}
              {item.ai_comment && (
                <div style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#cbd5e1',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start'
                }}>
                  <span>💡</span>
                  <span style={{ lineHeight: '1.4' }}>{item.ai_comment}</span>
                </div>
              )}

              {/* ボタン */}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'center',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    padding: '10px 0',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    marginTop: '4px'
                  }}
                >
                  仕入れ先ページを開く ↗
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
