'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Home() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // DBから最新データ20件を取得
  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('surging_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('データ取得エラー:', error)
    } else if (data) {
      setItems(data)
    }
  }

  // 🔄 ボタン押下時にバックエンドAPIを直接起動 ➔ DBから最新一覧を再取得
  const handleRealtimeTrigger = async () => {
    setLoading(true)
    try {
      // 1. /api/scrape を叩いて Google Trends / 辞書展開から新規データをDBへ即時保存
      await fetch('/api/scrape', { method: 'POST' })
      // 2. 保存された最新データをDBから読み込み
      await fetchItems()
    } catch (e) {
      console.error('リアルタイム取得エラー:', e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto font-sans">
      {/* ヘッダー */}
      <header className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-amber-400 flex items-center gap-1">
            🔥 せどりAI プロフェッショナル
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            1,700語辞書 × 100クエリ展開 / リアルタイム自動検出
          </p>
        </div>
        <button
          onClick={handleRealtimeTrigger}
          disabled={loading}
          className="ml-2 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1 shadow-lg disabled:opacity-50"
        >
          {loading ? '⚡ 100分析中...' : '🔄 リアルタイム取得'}
        </button>
      </header>

      {/* 商品カード一覧 */}
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id || item.created_at} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            {/* ランク・判定・スピード */}
            <div className="flex justify-between items-center mb-2 text-xs">
              <div className="flex gap-1.5 flex-wrap">
                <span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                  【{item.rank}】 {item.score}点
                </span>
                <span className="bg-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded border border-rose-500/30">
                  {item.buy_decision || '🔥 即買い(BUY)'}
                </span>
              </div>
              <span className="text-slate-400 font-medium">
                ⏱ {item.sales_speed}
              </span>
            </div>

            {/* タイトル */}
            <h2 className="font-bold text-sm mb-2 text-slate-100 leading-snug">{item.item_title}</h2>

            {/* AI分析理由 */}
            {item.ai_reason && (
              <p className="text-xs text-amber-200/80 bg-amber-950/30 p-2 rounded mb-3 border border-amber-900/40">
                💬 AI分析: {item.ai_reason}
              </p>
            )}

            {/* 価格・利益計算 */}
            <div className="grid grid-cols-4 gap-1 text-center bg-slate-950 p-2.5 rounded-lg mb-3 text-xs">
              <div>
                <div className="text-slate-500 text-[10px]">仕入額</div>
                <div className="font-semibold text-slate-300">¥{item.purchase_price?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">販売価格</div>
                <div className="font-semibold text-slate-300">¥{item.avg_sold_price?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">見込み利益</div>
                <div className="font-bold text-emerald-400">+¥{item.expected_profit?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">利益率</div>
                <div className="font-bold text-amber-400">{item.profit_margin || '30'}%</div>
              </div>
            </div>

            {/* 6店舗マルチプラットフォーム検索URL */}
            <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
              <a href={item.mercari_url || '#'} target="_blank" rel="noreferrer" className="bg-red-600 hover:bg-red-500 text-white py-1.5 rounded text-center transition">メルカリ</a>
              <a href={item.amazon_url || '#'} target="_blank" rel="noreferrer" className="bg-amber-600 hover:bg-amber-500 text-white py-1.5 rounded text-center transition">Amazon</a>
              <a href={item.keepa_url || '#'} target="_blank" rel="noreferrer" className="bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 rounded text-center transition">Keepa</a>
              <a href={item.paypay_url || '#'} target="_blank" rel="noreferrer" className="bg-purple-600 hover:bg-purple-500 text-white py-1.5 rounded text-center transition">Yahoo!フリマ</a>
              <a href={item.surugaya_url || '#'} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded text-center transition">駿河屋</a>
              <a href={item.hardoff_url || '#'} target="_blank" rel="noreferrer" className="bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 rounded text-center transition">ハードオフ</a>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
