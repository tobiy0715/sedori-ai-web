import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

export async function POST() {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is missing' }, { status: 500 })
    }

    const prompt = `
あなたはプロのせどり・転売リサーチャーです。
現在、Googleトレンドやラッコキーワード、SNS、各種予約サイトで検索数が急上昇・話題沸騰している最新の利益商品・トレンド商品（フィギュア、食玩、カード、ホビー、限定本、アニメ化決定作品など）を10件分析・生成してください。

以下のJSON配列フォーマットのみで出力してください。markdown記法（\`\`\`json等）は不要です。

[
  {
    "item_title": "【急上昇】商品名や作品名・限定版",
    "rank": "S",
    "score": 95,
    "buy_decision": "🔥 即買い(BUY)",
    "purchase_price": 2500,
    "avg_sold_price": 5800,
    "expected_profit": 2300,
    "profit_margin": 40,
    "sales_speed": "即売れ(24h以内)",
    "ai_reason": "アニメ化決定およびラッコキーワードで『予約 プレ値』の検索数が急上昇。店舗・電脳ともに即完売傾向。",
    "trending_keywords": ["カグラバチ", "アニメ化", "決定", "プレ値"],
    "seller_count": 0
  }
]
`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json({ success: false, error: `Gemini API Error: ${errText}` }, { status: 500 })
    }

    const resJson = await response.json()
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    
    let generatedItems = []
    try {
      generatedItems = JSON.parse(rawText.replace(/```json|```/g, '').trim())
    } catch (e) {
      console.error('JSON Parse error', e)
    }

    if (!Array.isArray(generatedItems) || generatedItems.length === 0) {
      return NextResponse.json({ success: false, error: 'AIからのデータ取得に失敗しました' }, { status: 500 })
    }

    // DB構造に合わせて安全にデータをセット
    const recordsToInsert = generatedItems.map((item: any) => ({
      item_title: String(item.item_title || '【急上昇】注目商品'),
      rank: String(item.rank || 'A'),
      score: Number(item.score) || 90,
      buy_decision: String(item.buy_decision || '🔥 即買い(BUY)'),
      purchase_price: Number(item.purchase_price) || 0,
      avg_sold_price: Number(item.avg_sold_price) || 0,
      expected_profit: Number(item.expected_profit) || 0,
      profit_margin: Number(item.profit_margin) || 0,
      sales_speed: String(item.sales_speed || '24h以内'),
      ai_reason: String(item.ai_reason || ''),
      seller_count: Number(item.seller_count) ?? 1,
      mercari_url: `https://jp.mercari.com/search?keyword=${encodeURIComponent(item.item_title || '')}`,
      amazon_url: `https://www.amazon.co.jp/s?k=${encodeURIComponent(item.item_title || '')}`,
      keepa_url: `https://keepa.com/#!search/5-${encodeURIComponent(item.item_title || '')}`,
      paypay_url: `https://paypayfleamarket.yahoo.co.jp/search/${encodeURIComponent(item.item_title || '')}`
    }))

    // Supabaseへ挿入
    const { error: dbError } = await supabase.from('surging_items').insert(recordsToInsert)

    if (dbError) {
      console.error('Supabase Insert Error:', dbError)
      return NextResponse.json({ success: false, error: `DB Error: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: recordsToInsert.length })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
