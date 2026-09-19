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

  const renderHighlightedComment = (comment: string) => {
    if (!comment) return '';
    const regex = /(買い|見送り|微妙|即仕入れ|要検討)/g;
    const parts = comment.split(regex);

    return parts.map((part, i) => {
      if (part === "買い" || part === "即仕入れ") {
        return <span key={i} style={{ color: '#facc15', fontWeight: 'bold' }}>{part}</span>;
      } else if (part === "見送り") {
        return <span key={i} style={{ color: '#ef4444', fontWeight: 'bold' }}>{part}</span>;
      } else if (part === "微妙" || part === "要検討") {
        return <span key={i} style={{ color: '#22d3ee', fontWeight: 'bold' }}>{part}</span>;
      }
      return part;
    });
  };

  return (
    <main style={{ backgroundColor: '#020617', color: '#ffffff', minHeight: '100vh', padding: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        
        {/* iPhoneヘッダー */}
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>🔥 せどりAI プロフェッショナル</h1>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>Keepa・セラースケット・poipoiのイイトコ取り</p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>読み込み中...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {items.map((item) => (
              <div key={item.id} style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
                
                {/* ランク・回転速度・セラースケット風リスク判定 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', fontSize: '10px', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                      【{item.rank}】{item.score}点
                    </span>
                    {item.sales_speed && (
                      <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '10px', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                        ⚡ {item.sales_speed}
                      </span>
                    )}
                    {item.risk_level && item.risk_level !== '安全' && (
                      <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '10px', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {item.risk_level}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>
                    {new Date(item.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* 商品タイトル */}
                <h2 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '10px', lineHeight: '1.3' }}>{item.item_title}</h2>

                {/* 価格 & 相場 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', backgroundColor: '#020617', padding: '8px', borderRadius: '8px', marginBottom: '10px', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>仕入目安</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>¥{item.purchase_price?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#38bdf8' }}>相場平均</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8', marginTop: '2px' }}>¥{item.avg_sold_price ? item.avg_sold_price.toLocaleString() : '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>見込み利益</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: item.expected_profit >= 0 ? '#34d399' : '#f87171', marginTop: '2px' }}>
                      {item.expected_profit >= 0 ? '+' : ''}¥{item.expected_profit?.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* AI解析理由 */}
                <div style={{ backgroundColor: '#1e293b', padding: '8px 10px', borderRadius: '6px', marginBottom: '10px' }}>
                  <p style={{ fontSize: '12px', lineHeight: '1.4', margin: 0, color: '#cbd5e1' }}>
                    💡 {renderHighlightedComment(item.ai_comment)}
                  </p>
                </div>

                {/* 1タップ分析 & 横断サーチボタン */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
                  <a href={item.mercari_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#059669', color: '#fff', textAlign: 'center', fontSize: '10px', padding: '7px 0', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}>
                    🛍️ メルカリ
                  </a>
                  <a href={item.amazon_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#d97706', color: '#fff', textAlign: 'center', fontSize: '10px', padding: '7px 0', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}>
                    📦 Amazon
                  </a>
                  <a href={item.keepa_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#4f46e5', color: '#fff', textAlign: 'center', fontSize: '10px', padding: '7px 0', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}>
                    📊 Keepa推移
                  </a>
                  <a href={item.yahoo_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#1d4ed8', color: '#fff', textAlign: 'center', fontSize: '10px', padding: '7px 0', borderRadius: '6px', textDecoration: 'none' }}>
                    PayPayフリマ
                  </a>
                  {item.surugaya_url && (
                    <a href={item.surugaya_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#0284c7', color: '#fff', textAlign: 'center', fontSize: '10px', padding: '7px 0', borderRadius: '6px', textDecoration: 'none' }}>
                      駿河屋
                    </a>
                  )}
                  {item.hardoff_url && (
                    <a href={item.hardoff_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#15803d', color: '#fff', textAlign: 'center', fontSize: '10px', padding: '7px 0', borderRadius: '6px', textDecoration: 'none' }}>
                      ハードオフ
                    </a>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
