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

  // データ取得関数
  const fetchItems = async () => {
    setLoading(true)
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
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto">
      {/* 1. レイアウト崩れを修正したヘッダー領域 */}
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-amber-400 flex items-center gap-1">
            🔥 せどりAI プロフェッショナル
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Keepa・セラースケット・poipoiのイイトコ取り / 5〜10分自動更新
          </p>
        </div>
        <button
          onClick={fetchItems}
          disabled={loading}
          className="ml-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700 shrink-0"
        >
          🔄 {loading ? '読み込み中...' : '更新'}
        </button>
      </header>

      {/* 2. 商品カード一覧 */}
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id || item.created_at} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            {/* バッジ・タイムスタンプ */}
            <div className="flex justify-between items-center mb-2 text-xs">
              <div className="flex gap-2">
                <span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                  【{item.rank}】 {item.score}点
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                  ⚡ {item.sales_speed}
                </span>
              </div>
              <span className="text-slate-500">
                {item.created_at ? new Date(item.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
              </span>
            </div>

            {/* 商品タイトル */}
            <h2 className="font-bold text-sm mb-3 line-clamp-2">{item.item_title}</h2>

            {/* 価格表示 */}
            <div className="grid grid-cols-3 gap-2 text-center bg-slate-950 p-2 rounded-lg mb-3 text-xs">
              <div>
                <div className="text-slate-400">仕入目安</div>
                <div className="font-semibold text-slate-200">¥{item.purchase_price?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-400">相場平均</div>
                <div className="font-semibold text-slate-200">¥{item.avg_sold_price?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-400">見込み利益</div>
                <div className="font-bold text-emerald-400">+¥{item.expected_profit?.toLocaleString()}</div>
              </div>
            </div>

            {/* 3. ボタン領域（6店舗フル対応：3列×2行） */}
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
              <a href={item.mercari_url || '#'} target="_blank" rel="noreferrer" className="bg-red-600 hover:bg-red-500 text-white py-2 rounded text-center">
                メルカリ
              </a>
              <a href={item.amazon_url || '#'} target="_blank" rel="noreferrer" className="bg-amber-600 hover:bg-amber-500 text-white py-2 rounded text-center">
                Amazon
              </a>
              <a href={item.keepa_url || '#'} target="_blank" rel="noreferrer" className="bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded text-center">
                Keepa
              </a>
              <a href={item.paypay_url || `https://paypayfleamarket.yahoo.co.jp/search/${encodeURIComponent(item.item_title)}`} target="_blank" rel="noreferrer" className="bg-purple-600 hover:bg-purple-500 text-white py-2 rounded text-center">
                Yahoo!フリマ
              </a>
              <a href={item.surugaya_url || `https://www.suruga-ya.jp/search?search_word=${encodeURIComponent(item.item_title)}`} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-center">
                駿河屋
              </a>
              <a href={item.hardoff_url || `https://netmall.hardoff.co.jp/search/?q=${encodeURIComponent(item.item_title)}`} target="_blank" rel="noreferrer" className="bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded text-center">
                ハードオフ
              </a>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
