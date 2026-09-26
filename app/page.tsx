'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export default function Home() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // フィルター＆タブ状態
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [maxBuyPrice, setMaxBuyPrice] = useState<number>(10000)
  const [minProfit, setMinProfit] = useState<number>(1000)
  const [favorites, setFavorites] = useState<string[]>([])
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)

  // ローカルストレージからお気に入りを読み込み
  useEffect(() => {
    const savedFavs = localStorage.getItem('sedori_favorites')
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs))
      } catch (e) {
        console.error('Fav parse error', e)
      }
    }
    fetchItems()
  }, [])

  // お気に入りトグル
  const toggleFavorite = (idStr: string) => {
    let updated = []
    if (favorites.includes(idStr)) {
      updated = favorites.filter((fav) => fav !== idStr)
    } else {
      updated = [...favorites, idStr]
    }
    setFavorites(updated)
    localStorage.setItem('sedori_favorites', JSON.stringify(updated))
  }

  // データの取得
  const fetchItems = async () => {
    if (!supabaseUrl || !supabaseKey) return
    try {
      const { data } = await supabase
        .from('surging_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)

      if (data) setItems(data)
    } catch (e) {
      console.error('Fetch error:', e)
    }
  }

  // リアルタイム取得呼び出し
  const handleScrape = async () => {
    setLoading(true)
    try {
      let res = await fetch('/api/cron', { method: 'POST' })
      if (!res.ok) {
        res = await fetch('/api/scrape', { method: 'POST' })
      }
      
      const json = await res.json()
      if (json.success) {
        await fetchItems()
      } else {
        alert('取得エラー: ' + (json.error || '処理に失敗しました'))
      }
    } catch (e: any) {
      alert('通信エラー: ' + (e?.message || '接続に失敗しました'))
    } finally {
      setLoading(false)
    }
  }

  // 日時フォーマット
  const formatDate = (dateStr: any) => {
    if (!dateStr) return '直近'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return String(dateStr)
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    } catch {
      return '直近'
    }
  }

  // フィルタリング処理
  const filteredItems = items.filter((item) => {
    const itemId = String(item.id || item.item_title)
    if (showOnlyFavorites && !favorites.includes(itemId)) return false
    
    // 価格フィルター
    const buyPrice = item.purchase_price || 0
    const profit = item.expected_profit || 0
    if (buyPrice > maxBuyPrice) return false
    if (profit < minProfit) return false

    // カテゴリフィルター
    if (selectedCategory === 'all') return true
    if (selectedCategory === 'hobby') return item.item_title.includes('フィギュア') || item.item_title.includes('アクスタ') || item.item_title.includes('缶バッジ')
    if (selectedCategory === 'game') return item.item_title.includes('カード') || item.item_title.includes('BOX') || item.item_title.includes('ゲーム')
    if (selectedCategory === 'media') return item.ai_reason?.includes('映画') || item.ai_reason?.includes('アニメ') || item.item_title.includes('限定')
    if (selectedCategory === 'trend') return (item.profit_margin || 0) >= 50

    return true
  })

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 max-w-2xl mx-auto pb-20">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-4 pt-2">
        <div>
          <h1 className="text-xl font-bold text-amber-400 flex items-center gap-1">
            🔥 せどりAI プロフェッショナル
          </h1>
          <p className="text-xs text-slate-400">リアルタイム自動検出・利確判断エンジン</p>
        </div>
        <button
          onClick={handleScrape}
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold px-3 py-2 rounded-lg text-sm flex items-center gap-1 shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? '🔄 取得中...' : '🔄 リアルタイム取得'}
        </button>
      </div>

      {/* タブバー */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none text-xs">
        {[
          { id: 'all', label: '🔥 すべて' },
          { id: 'hobby', label: '🤖 ホビー・フィギュア' },
          { id: 'game', label: '🎮 ゲーム・カード' },
          { id: 'media', label: '🎬 メディア化' },
          { id: 'trend', label: '📈 高騰トレンド' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setSelectedCategory(tab.id); setShowOnlyFavorites(false); }}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap border font-medium transition-all ${
              selectedCategory === tab.id && !showOnlyFavorites
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap border font-medium transition-all ${
            showOnlyFavorites
              ? 'bg-rose-500 text-white border-rose-400 font-bold'
              : 'bg-slate-900 text-rose-400 border-slate-800 hover:border-slate-700'
          }`}
        >
          ⭐ お気に入り ({favorites.length})
        </button>
      </div>

      {/* 挟み込み絞り込みフィルター */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4 text-xs space-y-2">
        <div className="flex justify-between text-slate-400 font-medium">
          <span>🎯 仕入れ上限: <strong className="text-amber-400">¥{maxBuyPrice.toLocaleString()}</strong> 以下</span>
          <span>💰 見込み利益: <strong className="text-emerald-400">¥{minProfit.toLocaleString()}</strong> 以上</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="range"
            min="1000"
            max="30000"
            step="1000"
            value={maxBuyPrice}
            onChange={(e) => setMaxBuyPrice(Number(e.target.value))}
            className="accent-amber-500 w-full cursor-pointer"
          />
          <input
            type="range"
            min="500"
            max="15000"
            step="500"
            value={minProfit}
            onChange={(e) => setMinProfit(Number(e.target.value))}
            className="accent-emerald-500 w-full cursor-pointer"
          />
        </div>
      </div>

      {/* 商品件数 */}
      <div className="text-right text-xs text-slate-400 mb-2">
        表示中: <span className="text-amber-400 font-bold">{filteredItems.length}</span> 件
      </div>

      {/* 商品リスト */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm bg-slate-900 rounded-xl border border-slate-800">
            該当する商品がありません。フィルターを変更するか「リアルタイム取得」を押してください。
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const itemId = String(item.id || item.item_title)
            const isFav = favorites.includes(itemId)

            return (
              <div key={itemId + idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md relative">
                {/* 最上段：日時 & スピード & ★キープ */}
                <div className="flex justify-between items-center text-[11px] text-slate-400 mb-2 border-b border-slate-800/80 pb-2">
                  <span className="flex items-center gap-1 text-amber-300 font-mono">
                    🕒 {formatDate(item.created_at)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-medium">
                      ⏱️ {item.sales_speed || '売却目安: 24時間以内'}
                    </span>
                    <button
                      onClick={() => toggleFavorite(itemId)}
                      className={`text-base leading-none transition-transform active:scale-125 ${
                        isFav ? 'text-amber-400 scale-110' : 'text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      ★
                    </button>
                  </div>
                </div>

                {/* バッジ行 */}
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded border border-amber-500/30">
                    【{item.rank || 'S'}】{item.score || 90}点
                  </span>
                  <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-2 py-0.5 rounded border border-rose-500/30">
                    {item.buy_decision || '🔥 即買い(BUY)'}
                  </span>
                  {(item.seller_count === 0 || item.score >= 95) && (
                    <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-2 py-0.5 rounded border border-purple-500/30">
                      ⚡ プレ値/ライバル少
                    </span>
                  )}
                </div>

                {/* タイトル */}
                <h2 className="font-bold text-base mb-3 text-slate-100 leading-snug">
                  {item.item_title}
                </h2>

                {/* 価格表示 */}
                <div className="grid grid-cols-4 gap-2 bg-slate-950 p-2.5 rounded-lg mb-3 text-center border border-slate-800/80">
                  <div>
                    <div className="text-[10px] text-slate-400">仕入額</div>
                    <div className="text-xs font-semibold text-slate-300">¥{(item.purchase_price || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">想定売価</div>
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

                {/* AI利確理由 */}
                {item.ai_reason && (
                  <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded mb-3 border border-slate-800/50 flex gap-1.5">
                    <span>💡</span>
                    <span className="leading-relaxed">{item.ai_reason}</span>
                  </div>
                )}

                {/* リサーチボタン */}
                <div className="grid grid-cols-3 gap-2">
                  <a href={item.mercari_url || '#'} target="_blank" rel="noreferrer" className="bg-red-600/80 hover:bg-red-600 text-white text-xs py-1.5 rounded text-center font-medium transition-colors">メルカリ</a>
                  <a href={item.amazon_url || '#'} target="_blank" rel="noreferrer" className="bg-amber-600/80 hover:bg-amber-600 text-white text-xs py-1.5 rounded text-center font-medium transition-colors">Amazon</a>
                  <a href={item.keepa_url || '#'} target="_blank" rel="noreferrer" className="bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs py-1.5 rounded text-center font-medium transition-colors">Keepa</a>
                  <a href={item.paypay_url || '#'} target="_blank" rel="noreferrer" className="bg-purple-600/80 hover:bg-purple-600 text-white text-xs py-1.5 rounded text-center font-medium transition-colors">Yahoo!フリマ</a>
                  <a href={item.surugaya_url || '#'} target="_blank" rel="noreferrer" className="bg-blue-600/80 hover:bg-blue-600 text-white text-xs py-1.5 rounded text-center font-medium transition-colors">駿河屋</a>
                  <a href={item.hardoff_url || '#'} target="_blank" rel="noreferrer" className="bg-teal-600/80 hover:bg-teal-600 text-white text-xs py-1.5 rounded text-center font-medium transition-colors">ハードオフ</a>
                </div>
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}
