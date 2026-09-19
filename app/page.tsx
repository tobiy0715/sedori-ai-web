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
      // Supabaseから最新20件を取得
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
    const interval = setInterval(fetchItems, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ backgroundColor: '#020617', color: '#f8fafc', minHeight: '100vh', padding: '16px' }}>
      <main style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* ヘッダー */}
        <header style={{ borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24', margin: 0 }}>
              🔥 せどりAI プロフェッショナル
            </h1>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>
              Keepa・セラースケット・poipoiのイイトコ取り / 5〜10分自動更新
            </p>
          </div>
          <button
            onClick={fetchItems}
            style={{ backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
          >
            🔄 更新
          </button>
        </header>

        {/* カードリスト */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b', fontSize: '14px' }}>
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
                : '時間不明';

              return (
                <div
                  key={item.id || item.created_at + item.item_title}
                  style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}
                >
                  {/* ランク・スコア・時間 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.4)', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>
                        【{item.rank || 'A'}】 {item.score || 75}点
                      </span>
                      <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '4px' }}>
                        ⚡ {item.sales_speed || '即売れ'}
                      </span>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>
                      {formattedTime}
                    </span>
                  </div>

                  {/* タイトル */}
                  <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#f8fafc', marginTop: 0, marginBottom: '12px' }}>
                    {item.item_title}
                  </h2>

                  {/* 価格情報 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', backgroundColor: '#020617', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', marginBottom: '12px' }}>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '10px', display: 'block' }}>仕入目安</span>
                      <span style={{ color: '#e2e8f0' }}>¥{item.purchase_price ? item.purchase_price.toLocaleString() : 0}</span>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '10px', display: 'block' }}>相場平均</span>
                      <span style={{ color: '#e2e8f0' }}>¥{item.avg_sold_price ? item.avg_sold_price.toLocaleString() : 0}</span>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '10px', display: 'block' }}>見込み利益</span>
                      <span style={{ fontWeight: 'bold', color: '#34d399' }}>+¥{item.expected_profit ? item.expected_profit.toLocaleString() : 0}</span>
                    </div>
                  </div>

                  {/* リンクボタン群 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '11px' }}>
                    {item.mercari_url && (
                      <a href={item.mercari_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#dc2626', color: '#ffffff', textAlign: 'center', padding: '6px 0', borderRadius: '4px', textDecoration: 'none' }}>
                        メルカリ
                      </a>
                    )}
                    {item.amazon_url && (
                      <a href={item.amazon_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#d97706', color: '#ffffff', textAlign: 'center', padding: '6px 0', borderRadius: '4px', textDecoration: 'none' }}>
                        Amazon
                      </a>
                    )}
                    {item.keepa_url && (
                      <a href={item.keepa_url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#4f46e5', color: '#ffffff', textAlign: 'center', padding: '6px 0', borderRadius: '4px', textDecoration: 'none' }}>
                        Keepa
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b', fontSize: '14px' }}>
              データがまだありません。
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
