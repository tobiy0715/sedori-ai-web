'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function HomePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('surging_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Supabase fetch error:', error);
      } else if (data) {
        setItems(data);
      }
    } catch (err) {
      console.error('Fetch exception:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 max-w-xl mx-auto font-sans">
      {/* ヘッダー */}
      <header className="mb-6 border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">
            🔥 せどりAI プロフェッショナル
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Keepa・セラースケット・poipoiのイイトコ取り / 5〜10分自動更新
          </p>
        </div>
        <button
          onClick={fetchItems}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition active:scale-95 shrink-0"
        >
          🔄 更新
        </button>
      </header>

      {/* カードリスト */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm animate-pulse">
            最新のAI精査データを読み込み中...
          </div>
        ) : items && items.length > 0 ? (
          items.map((item) => {
            const formattedTime = item.created_at
              ? new Date(item.created_at).toLocaleString('ja-JP', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : '';

            return (
              <div
                key={item.id || item.created_at + item.item_title}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3"
              >
                {/* ランク・スコア・時間 */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold px-2 py-0.5 rounded">
                      【{item.rank || 'A'}】 {item.score || 75}点
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 font-medium px-2 py-0.5 rounded flex items-center gap-1">
                      ⚡ {item.sales_speed || '即売れ'}
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {formattedTime}
                  </span>
                </div>

                {/* 商品タイトル */}
                <h2 className="text-base font-bold text-slate-100 leading-snug">
                  {item.item_title}
                </h2>

                {/* 数値データ */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-lg text-center text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">仕入目安</span>
                    <span className="font-semibold text-slate-200">
                      ¥{item.purchase_price?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">相場平均</span>
                    <span className="font-semibold text-slate-200">
                      ¥{item.avg_sold_price?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">見込み利益</span>
                    <span className="font-bold text-emerald-400">
                      +¥{item.expected_profit?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>

                {/* AIディベート分析コメント */}
                {item.ai_comment && (
                  <div className="text-xs text-amber-200/90 bg-amber-950/30 border border-amber-900/40 p-2.5 rounded-lg leading-relaxed">
                    💡 {item.ai_comment}
                  </div>
                )}

                {/* 各種検索・推移リンクボタン */}
                <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px]">
                  {item.mercari_url && (
                    <a
                      href={item.mercari_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-red-600/80 hover:bg-red-600 text-white text-center py-1.5 rounded font-medium transition"
                    >
                      🛍️ メルカリ
                    </a>
                  )}
                  {item.amazon_url && (
                    <a
                      href={item.amazon_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-amber-600/80 hover:bg-amber-600 text-white text-center py-1.5 rounded font-medium transition"
                    >
                      📦 Amazon
                    </a>
                  )}
                  {item.keepa_url && (
                    <a
                      href={item.keepa_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-600/80 hover:bg-indigo-600 text-white text-center py-1.5 rounded font-medium transition"
                    >
                      📊 Keepa推移
                    </a>
                  )}
                  {item.yahoo_url && (
                    <a
                      href={item.yahoo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600/80 hover:bg-blue-600 text-white text-center py-1.5 rounded font-medium transition"
                    >
                      PayPayフリマ
                    </a>
                  )}
                  {item.surugaya_url && (
                    <a
                      href={item.surugaya_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-sky-700/80 hover:bg-sky-700 text-white text-center py-1.5 rounded font-medium transition"
                    >
                      駿河屋
                    </a>
                  )}
                  {item.hardoff_url && (
                    <a
                      href={item.hardoff_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-700/80 hover:bg-emerald-700 text-white text-center py-1.5 rounded font-medium transition"
                    >
                      ハードオフ
                    </a>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-500 text-sm">
            データがまだありません。スクレイパーの実行をお待ちください。
          </div>
        )}
      </div>
    </main>
  );
}
