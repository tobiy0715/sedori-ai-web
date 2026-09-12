'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItems() {
      const { data, error } = await supabase
        .from('surging_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setItems(data);
      }
      setLoading(false);
    }
    fetchItems();
  }, []);

  // 判定に応じて文字色やスタイルを切り替える関数
  const getJudgmentStyle = (comment: string) => {
    if (comment.includes("買い") || comment.includes("即仕入れ")) {
      return "text-yellow-400 font-bold"; // 買い：黄色ボールド
    } else if (comment.includes("見送り")) {
      return "text-red-500 font-bold"; // 見送り：赤文字
    } else if (comment.includes("微妙") || comment.includes("要検討")) {
      return "text-cyan-400 font-bold"; // 微妙：水色
    }
    return "text-slate-300";
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-bold mb-1">🔥 せどりAI 利益商品ダッシュボード</h1>
        <p className="text-xs text-slate-400 mb-4">自動収集・AI解析されたリアルタイムトレンド一覧（自動更新有効）</p>

        {loading ? (
          <p className="text-center text-slate-400 py-10">読み込み中...</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-1 rounded font-bold">
                    【{item.rank}ランク】 スコア: {item.score}
                  </span>
                  <div className="text-xs text-slate-400 space-x-2">
                    <span>🕒 {new Date(item.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded">{item.category}</span>
                  </div>
                </div>

                <h2 className="text-lg font-bold mb-3">{item.item_title}</h2>

                <div className="grid grid-cols-2 gap-2 bg-slate-950/50 p-3 rounded-lg mb-3">
                  <div>
                    <div className="text-xs text-slate-400">仕入価格</div>
                    <div className="text-lg font-bold">¥{item.purchase_price?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">見込み利益</div>
                    <div className="text-lg font-bold text-emerald-400">+¥{item.expected_profit?.toLocaleString()}</div>
                  </div>
                </div>

                {/* AIコメントに動的スタイルを適用 */}
                <p className={`text-sm mb-4 leading-relaxed ${getJudgmentStyle(item.ai_comment)}`}>
                  💡 {item.ai_comment}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <a href={item.source_url || item.url} target="_blank" rel="noopener noreferrer" className="bg-slate-700 hover:bg-slate-600 text-center text-xs py-2 px-3 rounded font-bold flex items-center justify-center space-x-1">
                    <span>📰 ニュースソース ↗</span>
                  </a>
                  <a href={item.mercari_url} target="_blank" rel="noopener noreferrer" className="bg-emerald-600 hover:bg-emerald-500 text-center text-xs py-2 px-3 rounded font-bold flex items-center justify-center space-x-1">
                    <span>🛍️ メルカリ検索 ↗</span>
                  </a>
                  <a href={item.amazon_url} target="_blank" rel="noopener noreferrer" className="bg-amber-600 hover:bg-amber-500 text-center text-xs py-2 px-3 rounded font-bold flex items-center justify-center space-x-1">
                    <span>📦 Amazon検索 ↗</span>
                  </a>
                  <a href={item.yahoo_url} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-500 text-center text-xs py-2 px-3 rounded font-bold flex items-center justify-center space-x-1">
                    <span>🟡 Yahoo!フリマ ↗</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
