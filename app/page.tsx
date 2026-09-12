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

  // 判定に応じたテキスト色・スタイルの指定
  const getJudgmentStyle = (comment: string) => {
    if (comment.includes("判定: 買い") || comment.includes("即仕入れ")) {
      return { color: '#facc15', fontWeight: 'bold' }; // 買い：黄色ボールド
    } else if (comment.includes("判定: 見送り")) {
      return { color: '#ef4444', fontWeight: 'bold' }; // 見送り：赤文字
    } else if (comment.includes("判定: 微妙") || comment.includes("要検討")) {
      return { color: '#22d3ee', fontWeight: 'bold' }; // 微妙：水色
    }
    return { color: '#cbd5e1' };
  };

  return (
    <main style={{ backgroundColor: '#020617', color: '#ffffff', minHeight: '100vh', padding: '16px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>🔥 せどりAI 利益商品ダッシュボード</h1>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>自動収集・AI解析されたリアルタイムトレンド一覧（自動更新有効）</p>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>読み込み中...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {items.map((item) => (
              <div key={item.id} style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
                
                {/* ヘッダー情報 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', fontSize: '12px', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                    【{item.rank}ランク】 スコア: {item.score}
                  </span>
                  <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '8px' }}>
                    <span>🕒 {new Date(item.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>{item.category}</span>
                  </div>
                </div>

                {/* タイトル */}
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>{item.item_title}</h2>

                {/* 価格情報 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: 'rgba(2, 6, 23, 0.5)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>仕入価格</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>¥{item.purchase_price?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>見込み利益</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: item.expected_profit >= 0 ? '#34d399' : '#f87171' }}>
                      {item.expected_profit >= 0 ? '+' : ''}¥{item.expected_profit?.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* AIコメント（色の自動判定適用） */}
                <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0, ...getJudgmentStyle(item.ai_comment) }}>
                    💡 {item.ai_comment}
                  </p>
                </div>

                {/* 各種ボタン */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <a href={item.source_url || item.url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#334155', color: '#fff', textAlign: 'center', fontSize: '12px', padding: '10px', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none' }}>
                    📰 ニュースソース ↗
                  </a>
                  <a href={item.mercari_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#059669', color: '#fff', textAlign: 'center', fontSize: '12px', padding: '10px', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none' }}>
                    🛍️ メルカリ検索 ↗
                  </a>
                  <a href={item.amazon_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#d97706', color: '#fff', textAlign: 'center', fontSize: '12px', padding: '10px', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none' }}>
                    📦 Amazon検索 ↗
                  </a>
                  <a href={item.yahoo_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#2563eb', color: '#fff', textAlign: 'center', fontSize: '12px', padding: '10px', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none' }}>
                    🟡 Yahoo!フリマ ↗
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
