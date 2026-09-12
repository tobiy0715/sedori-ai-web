'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type Item = {
  id: number
  title: string
  category: string
  purchase_price: number
  estimated_profit: number
  score: number
  rank: string
  memo: string
  url: string
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  useEffect(() => {
    fetchItems()

    // リアルタイム変更検知の設定
    const channel = supabase
      .channel('realtime-items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
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
    <main className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            🔥 せどりAI 利益商品ダッシュボード
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            自動収集・AI解析されたリアルタイムデータ一覧（自動更新有効）
          </p>
        </div>

        <div className="grid gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
            >
              <div className="flex justify-between items-start gap-2">
                <span className="bg-amber-500/10 text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-md border border-amber-500/20">
                  【{item.rank}ランク】 スコア: {item.score}
                </span>
                <span className="text-xs text-slate-400">{item.category}</span>
              </div>

              <h2 className="text-lg font-bold text-slate-100">{item.title}</h2>

              <div className="grid grid-cols-2 gap-4 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-sm">
                <div>
                  <span className="text-slate-400 text-xs block">仕入価格</span>
                  <span className="font-semibold">
                    ¥{item.purchase_price?.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block">見込み利益</span>
                  <span className="font-bold text-emerald-400">
                    +¥{item.estimated_profit?.toLocaleString()}
                  </span>
                </div>
              </div>

              {item.memo && (
                <p className="text-xs text-slate-300 bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/30 flex items-center gap-1.5">
                  💡 {item.memo}
                </p>
              )}

              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm py-2.5 rounded-lg transition-colors"
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
