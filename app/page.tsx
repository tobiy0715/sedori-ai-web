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
      className="min-h-screen p-4 sm:p-6 md:p-10" 
      style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="border-b border-slate-800 pb-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
            🔥 せどりAI 利益商品ダッシュボード
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            自動収集・AI解析されたリアルタイムデータ一覧（自動更新有効）
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl p-4 sm:p-6 space-y-4 shadow-lg"
              style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
            >
              {/* バッジ・日時・カテゴリ（レスポンシブ配置） */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/50 pb-3">
                <span 
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}
                >
                  【{item.rank}ランク】 スコア: {item.score}
                </span>
                
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="font-mono bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                    🕒 {formatDate(item.created_at)}
                  </span>
                  <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 font-medium">
                    {item.category || 'その他'}
                  </span>
                </div>
              </div>

              {/* タイトル */}
              <h2 className="text-base sm:text-lg font-bold leading-snug text-slate-100">
                {item.item_title}
              </h2>

              {/* 価格情報（2列グリッド） */}
              <div 
                className="grid grid-cols-2 gap-4 p-3 rounded-lg text-sm"
                style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
              >
                <div>
                  <span className="text-slate-400 text-xs block mb-0.5">仕入価格</span>
                  <span className="font-semibold text-slate-200 text-base">
                    ¥{item.purchase_price?.toLocaleString() || 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block mb-0.5">見込み利益</span>
                  <span className="font-bold text-emerald-400 text-base">
                    +¥{item.expected_profit?.toLocaleString() || 0}
                  </span>
                </div>
              </div>

              {/* AIコメント */}
              {item.ai_comment && (
                <div 
                  className="text-xs sm:text-sm text-slate-300 p-3 rounded-lg flex items-start gap-2"
                  style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                >
                  <span className="text-base shrink-0">💡</span>
                  <span className="leading-relaxed">{item.ai_comment}</span>
                </div>
              )}

              {/* ボタン */}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center font-bold text-sm py-3 rounded-lg transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#059669', color: '#ffffff' }}
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
