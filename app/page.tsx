'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export default function Home() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // データの取得
  const fetchItems = async () => {
    if (!supabaseUrl || !supabaseKey) return
    const { data } = await supabase
      .from('surging_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) setItems(data)
  }

  useEffect(() => {
    fetchItems()
  }, [])

  // 「リアルタイム取得」ボタン処理（API自動呼び出し -> DB保存 -> 画面更新）
  const handleScrape = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/scrape', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        await fetchItems() // DBから最新データを再読み込み
      } else {
        alert('取得エラー: ' + (json.error || '失敗しました'))
      }
    } catch (e: any) {
      alert('通信エラー: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h1 className="text-xl font-bold text-amber-400 flex items-center gap-1">
            🔥 せどりAI プロフェッショナル
          </h1>
          <p className="text-xs text-slate-400">リアルタイム自動検出・AI利確判定</p>
        </div>
        <button
          onClick={handleScrape}
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold px-3 py-2 rounded-lg text-sm flex items-center gap-1 shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? '🔄 取得中...' : '🔄 リアルタイム取得'}
        </button>
      </div>

      {/* 商品リスト */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            データがありません。「リアルタイム取得」を押してください。
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id || Math.random()} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
              {/* バッジ行 */}
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded border border-amber-500/30">
                  【{item.rank || 'S'}】{item.score || 90}点
                </span>
                <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-2 py-0.5 rounded border border-rose-500/30">
                  {item.buy_decision || '🔥 即買い(BUY)'}
                </span>
                <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
                  ⏱️ {item.sales_speed || '売却目安: 1〜2日'}
                </span>
              </div>

              {/* タイトル */}
              <h2 className="font-bold text-base mb-3 text-slate-100">
                {item.item_title}
              </h2>

              {/* 価格表示 */}
              <div className="grid grid-cols-4 gap-2 bg-slate-950/60 p-2.5 rounded-lg mb-3 text-center border border-slate-800/50">
                <div>
                  <div className="text-[10px] text-slate-400">仕入額</div>
                  <div className="text-xs font-semibold text-slate-300">¥{(item.purchase_price || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">販売価格</div>
                  <div className="text-xs font-semibold text-slate-300">¥{(item.avg_sold_price || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">見込み利益</div>
                  <div className="text-xs font-bold text-emerald-400">+¥{(item.expected_profit || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">利益率</div>
                  <div className="text-xs font-bold text-amber-400">{item.profit_margin || 0}%</div>
                </div>
              </div>

              {/* AI理由 */}
              {item.ai_reason && (
                <div className="text-xs text-slate-400 bg-slate-950/40 p-2 rounded mb-3 border border-slate-800/30">
                  💡 {item.ai_reason}
                </div>
              )}

              {/* 各種検索ボタン */}
              <div className="grid grid-cols-3 gap-2">
                <a href={item.mercari_url} target="_blank" rel="noreferrer" className="bg-red-600/80 hover:bg-red-600 text-white text-xs py-1.5 rounded text-center font-medium">メルカリ</a>
                <a href={item.amazon_url} target="_blank" rel="noreferrer" className="bg-amber-600/80 hover:bg-amber-600 text-white text-xs py-1.5 rounded text-center font-medium">Amazon</a>
                <a href={item.keepa_url} target="_blank" rel="noreferrer" className="bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs py-1.5 rounded text-center font-medium">Keepa</a>
                <a href={item.paypay_url} target="_blank" rel="noreferrer" className="bg-purple-600/80 hover:bg-purple-600 text-white text-xs py-1.5 rounded text-center font-medium">Yahoo!フリマ</a>
                <a href={item.surugaya_url} target="_blank" rel="noreferrer" className="bg-blue-600/80 hover:bg-blue-600 text-white text-xs py-1.5 rounded text-center font-medium">駿河屋</a>
                <a href={item.hardoff_url} target="_blank" rel="noreferrer" className="bg-teal-600/80 hover:bg-teal-600 text-white text-xs py-1.5 rounded text-center font-medium">ハードオフ</a>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
