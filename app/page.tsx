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

  // 「買い」「見送り」「微妙」などの特定文字列だけの色を変える関数
  const renderHighlightedComment = (comment: string) => {
    const regex = /(買い|見送り|微妙|即仕入れ|要検討)/g;
    const parts = comment.split(regex);

    return parts.map((part, i) => {
      if (part === "買い" || part === "即仕入れ") {
        return <span key={i} style={{ color: '#ca8a04', fontWeight: 'bold' }}>{part}</span>; // 黄色（ゴールド）
      } else if (part === "見送り") {
        return <span key={i} style={{ color: '#dc2626', fontWeight: 'bold' }}>{part}</span>; // 赤文字
      } else if (part === "微妙" || part === "要検討") {
        return <span key={i} style={{ color: '#0284c7', fontWeight: 'bold' }}>{part}</span>; // 水色
      }
      return part;
    });
  };

  return (
    <main style={{ backgroundColor: '#ffffff', color: '#1e293b', minHeight: '100vh', padding: '16px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>🔥 せどりAI 利益商品ダッシュボード</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>自動収集・AI解析されたリアルタイムトレンド一覧（自動更新有効）</p>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>読み込み中...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {items.map((item) => (
              <div key={item.id} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                
                {/* ヘッダー情報 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '12px', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                    【{item.rank}ランク】 スコア: {item.score}
                  </span>
                  <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px' }}>
                    <span>🕒 {new Date(item.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{item.category}</span>
                  </div>
                </div>

                {/* タイトル */}
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#0f172a' }}>{item.item_title}</h2>

                {/* 価格情報 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>仕入価格</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>¥{item.purchase_price?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>見込み利益</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: item.expected_profit >= 0 ? '#16a34a' : '#dc2626' }}>
                      {item.expected_profit >= 0 ? '+' : ''}¥{item.expected_profit?.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* AIコメント（指定文字列だけ色変更） */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0, color: '#334155' }}>
                    💡 {renderHighlightedComment(item.ai_comment)}
                  </p>
                </div>

                {/* 各種ボタン */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <a href={item.source_url || item.url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#475569', color: '#fff', textAlign: 'center', fontSize: '12px', padding: '10px', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none' }}>
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
