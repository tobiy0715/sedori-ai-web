import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/genai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const genai = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY || '' })

// Google Trends (日本) RSS URL
const GOOGLE_TRENDS_RSS = 'https://trends.google.co.jp/trending/rss?geo=JP'

// XMLから急上昇キーワードを抽出する簡略関数
async function fetchGoogleTrendsKeywords(): Promise<string[]> {
  try {
    const res = await fetch(GOOGLE_TRENDS_RSS, { cache: 'no-store' })
    const xmlText = await res.text()
    
    // <title>要素からトレンドワードを抽出
    const titles: string[] = []
    const matches = xmlText.matchAll(/<title>(.*?)<\/title>/g)
    for (const match of matches) {
      const title = match[1].replace('<![CDATA[', '').replace(']]>', '').trim()
      if (title && title !== 'Daily Search Trends' && !titles.includes(title)) {
        titles.push(title)
      }
    }
    return titles.length > 0 ? titles : ['ポケカ', 'サンリオ コラボ', 'ちいかわ 新作']
  } catch (error) {
    console.error('Google Trends Fetch Error:', error)
    return ['ポケカ', 'サンリオ コラボ', 'ちいかわ 新作']
  }
}

export async function POST() {
  try {
    // 1. Google Trendsから最新急上昇ワードを取得
    const rawTrends = await fetchGoogleTrendsKeywords()
    const targetTrend = rawTrends[Math.floor(Math.random() * rawTrends.length)]

    // 2. AIによる「せどり対象判定」および「せどりキーワード自動拡張」
    const prompt = `
あなたはプロのせどり・転売リサーチAIです。
入力された急上昇ワード: 「${targetTrend}」

【ステップ1: せどり対象判定】
この急上昇ワードが以下のジャンル（キャラクター / アニメ / 漫画 / ゲーム / 玩具・ホビー / フィギュア / トレカ / イベント / 映画 / アイドル / コラボ / ブランド）に関連しているか判定してください。
※スポーツの試合結果、政治・社会ニュース、芸能人のゴシップ等は対象外(NO)です。

【ステップ2: 拡張＆商品査定】
・判定がNOの場合: 判定をNOとして出力してください。
・判定がYESの場合: このトレンドワードから「仕入れで高騰・即完が見込める具体的商品名（拡張キーワード含む）」を1つ生成し、以下のJSON形式のみで出力してください。

出力フォーマット（JSON形式のみ）:
{
  "is_sedori_target": true または false,
  "original_trend": "${targetTrend}",
  "item_name": "拡張された具体的な商品・コラボ・グッズ名（例: ${targetTrend} 店舗限定 フィギュア）",
  "rank": "S" または "A+",
  "score": 88〜98の数値,
  "buy_decision": "🔥 即買い(BUY)" または "⚠️ 慎重(HOLD)",
  "sales_days": "1〜2日" または "2〜3日",
  "purchase_price": 推定仕入額(数値),
  "selling_price": 推定販売価格(数値),
  "profit": 見込み利益(数値),
  "profit_margin": 利益率(数値),
  "ai_reason": "判定理由および高騰ポイント(30文字以内)"
}
`

    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    const jsonMatch = text.match(/\{.*\}/s)
    if (!jsonMatch) throw new Error("JSON Parse Error")

    const resData = JSON.parse(jsonMatch[0])

    // 対象外(NO)判定の場合はスキップ処理メッセージを返す
    if (!resData.is_sedori_target) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `「${targetTrend}」はせどり対象外（スポーツ・ニュース等）のため除外されました。`
      })
    }

    // 3. せどり対象(YES)の場合、マルチプラットフォーム検索URLを生成してDBへ保存
    const cleanTitle = resData.item_name || targetTrend
    const encoded = encodeURIComponent(cleanTitle)

    const dbData = {
      item_title: cleanTitle,
      rank: resData.rank || "A+",
      score: resData.score || 92,
      sales_speed: `売却目安: ${resData.sales_days || '1〜2日'}`,
      buy_decision: resData.buy_decision || "🔥 即買い(BUY)",
      purchase_price: resData.purchase_price || 5000,
      avg_sold_price: resData.selling_price || 9000,
      expected_profit: resData.profit || 4000,
      profit_margin: resData.profit_margin || 44.4,
      ai_reason: resData.ai_reason || `【Google急上昇: ${targetTrend}】検出・自動拡張`,
      mercari_url: `https://jp.mercari.com/search?keyword=${encoded}`,
      amazon_url: `https://www.amazon.co.jp/s?k=${encoded}`,
      keepa_url: `https://keepa.com/#!search/5-${encoded}`,
      paypay_url: `https://paypayfleamarket.yahoo.co.jp/search/${encoded}`,
      surugaya_url: `https://www.suruga-ya.jp/search?search_word=${encoded}`,
      hardoff_url: `https://netmall.hardoff.co.jp/search/?q=${encoded}`,
      created_at: new Date().toISOString()
    }

    await supabase.from('surging_items').insert([dbData])

    return NextResponse.json({ success: true, item: dbData })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
