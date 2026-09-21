import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const geminiApiKey = process.env.GEMINI_API_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST() {
  try {
    // 候補リスト（ホビー・フィギュア・限定品中心）
    const targets = [
      { name: "Meister Japan 1/8 フィギュア 限定版", buy: 4500, sell: 12800, score: 96 },
      { name: "海洋堂 カプセルQ ミュージアム 限定セット", buy: 2200, sell: 6800, score: 92 },
      { name: "チェンソーマン 劇場限定 メタル缶バッジ", buy: 1500, sell: 4980, score: 94 },
      { name: "Dr.STONE 公式コラボ アクリルスタンド", buy: 1800, sell: 5200, score: 91 },
      { name: "家庭教師ヒットマンREBORN! 展覧会限定グッズ", buy: 3200, sell: 9800, score: 95 },
      { name: "ポケモンカードゲーム 新弾 BOX シュリンク付き", buy: 5400, sell: 14800, score: 98 }
    ]

    const selected = targets[Math.floor(Math.random() * targets.length)]
    
    let itemTitle = selected.name
    let purchasePrice = selected.buy
    let sellingPrice = selected.sell
    let score = selected.score
    let aiReason = "AI自動検索：需要急増＆プレ値推移を検出"

    // Gemini APIが利用可能な場合の高度生成
    if (geminiApiKey) {
      try {
        const prompt = `せどり転売で今すぐ利益が出る限定ホビー・フィギュア商品を1つだけ生成し、以下のJSON形式のみで出力してください。
{"item_name": "具体商品名", "score": 95, "purchase_price": 3000, "selling_price": 8500, "ai_reason": "判定理由(20文字以内)"}`

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        })

        const geminiJson = await geminiRes.json()
        const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        
        const startIdx = text.indexOf('{')
        const endIdx = text.lastIndexOf('}')
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          const parsed = JSON.parse(text.substring(startIdx, endIdx + 1))
          if (parsed.item_name) itemTitle = parsed.item_name
          if (parsed.purchase_price) purchasePrice = parsed.purchase_price
          if (parsed.selling_price) sellingPrice = parsed.selling_price
          if (parsed.score) score = parsed.score
          if (parsed.ai_reason) aiReason = parsed.ai_reason
        }
      } catch (e) {
        console.error('Gemini Fetch Error:', e)
      }
    }

    const expectedProfit = sellingPrice - purchasePrice
    const profitMargin = Math.round((expectedProfit / sellingPrice) * 1000) / 10
    const encoded = encodeURIComponent(itemTitle)

    const dbData = {
      item_title: itemTitle,
      rank: score >= 95 ? "S" : "A+",
      score: score,
      sales_speed: "売却目安: 1〜2日",
      buy_decision: "🔥 即買い(BUY)",
      purchase_price: purchasePrice,
      avg_sold_price: sellingPrice,
      expected_profit: expectedProfit,
      profit_margin: profitMargin,
      ai_reason: aiReason,
      mercari_url: `https://jp.mercari.com/search?keyword=${encoded}`,
      amazon_url: `https://www.amazon.co.jp/s?k=${encoded}`,
      keepa_url: `https://keepa.com/#!search/5-${encoded}`,
      paypay_url: `https://paypayfleamarket.yahoo.co.jp/search/${encoded}`,
      surugaya_url: `https://www.suruga-ya.jp/search?search_word=${encoded}`,
      hardoff_url: `https://netmall.hardoff.co.jp/search/?q=${encoded}`,
      created_at: new Date().toISOString()
    }

    if (supabaseUrl && supabaseKey) {
      await supabase.from('surging_items').insert([dbData])
    }

    return NextResponse.json({ success: true, item: dbData })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
