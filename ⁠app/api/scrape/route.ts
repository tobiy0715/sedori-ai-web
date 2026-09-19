import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/genai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const genai = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY || '' })

// 辞書マスター（とびー。定義のせどりキーワード辞書）
const DICTIONARY = {
  attributes: ["限定", "数量限定", "店舗限定", "劇場限定", "イベント限定", "非売品", "販促品", "特典", "入場特典", "ノベルティ", "初回限定", "受注限定"],
  rarity: ["完売", "売り切れ", "入手困難", "レア", "プレミア", "高騰", "相場", "再販なし", "生産終了", "絶版", "品薄"],
  goods: ["フィギュア", "アクスタ", "アクリルスタンド", "缶バッジ", "キーホルダー", "ぬいぐるみ", "マスコット", "カード", "トレカ", "プロモ", "ポスター", "クリアファイル", "一番くじ", "ガチャ"],
  stores: ["ファミマ", "セブン", "ローソン", "ドンキ", "アベイル", "しまむら", "アニメイト", "ジャンプショップ", "プレミアムバンダイ", "ポケモンセンター"],
  events: ["一番くじ", "コラボカフェ", "ポップアップ", "ポップアップショップ", "展覧会", "イベント", "フェア", "キャンペーン"]
}

// 100個の「○○ × キーワード」クエリを爆速生成する関数
function generate100SedoriKeywords(baseWord: string): string[] {
  const keywords: Set<string> = new Set()
  keywords.add(baseWord)
  keywords.add(`${baseWord} グッズ`)
  keywords.add(`${baseWord} フィギュア`)
  keywords.add(`${baseWord} 一番くじ`)

  // 各カテゴリから組み合わせて100個に達するまで生成
  const categories = Object.values(DICTIONARY).flat()
  for (const item of categories) {
    keywords.add(`${baseWord} ${item}`)
    if (keywords.size >= 100) break
  }

  // 二重掛け合わせ（例：○○ フィギュア 限定）で100個を補完
  for (const attr of DICTIONARY.attributes) {
    for (const good of DICTIONARY.goods) {
      if (keywords.size >= 100) break
      keywords.add(`${baseWord} ${attr} ${good}`)
    }
    if (keywords.size >= 100) break
  }

  return Array.from(keywords).slice(0, 100)
}

export async function POST() {
  try {
    // 例：Google Trends RSS または ジャンプ公式カレンダー等の情報を巡回
    const rawTrends = ['チェンソーマン', 'Dr.STONE', '家庭教師ヒットマンREBORN!', '呪術廻戦']
    const targetTrend = rawTrends[Math.floor(Math.random() * rawTrends.length)]

    // AIによる判定
    const prompt = `
急上昇・カレンダー情報: 「${targetTrend}」
これが【アニメ / 漫画 / キャラクター / ゲーム / ホビー / アイドル / ブランド】のせどり対象に関連するか判定してください。

JSON形式のみで回答:
{
  "is_sedori_target": true,
  "category": "アニメ/漫画",
  "reason": "ジャンプ人気作品・新グッズ発売予定あり"
}
`
    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(prompt)
    const resText = result.response.text()

    const jsonMatch = resText.match(/\{.*\}/s)
    if (!jsonMatch) throw new Error("JSON Parse Error")
    const resData = JSON.parse(jsonMatch[0])

    if (!resData.is_sedori_target) {
      return NextResponse.json({ success: true, skipped: true, message: `${targetTrend} は対象外` })
    }

    // 🎯 辞書を元に100個の「せどりキーワード」を一括自動生成！
    const generated100Keywords = generate100SedoriKeywords(targetTrend)

    // 代表キーワードでDBレコードを生成
    const primaryKeyword = generated100Keywords[1] || targetTrend
    const encoded = encodeURIComponent(primaryKeyword)

    const dbData = {
      item_title: `【100クエリ展開】${targetTrend}`,
      rank: "S",
      score: 95,
      sales_speed: "売却目安: 1〜2日",
      buy_decision: "🔥 即買い(BUY)",
      purchase_price: 3000,
      avg_sold_price: 7500,
      expected_profit: 4500,
      profit_margin: 60.0,
      ai_reason: `100ワード展開完了 (${generated100Keywords.slice(0, 3).join(', ')} 等)`,
      mercari_url: `https://jp.mercari.com/search?keyword=${encoded}`,
      amazon_url: `https://www.amazon.co.jp/s?k=${encoded}`,
      keepa_url: `https://keepa.com/#!search/5-${encoded}`,
      paypay_url: `https://paypayfleamarket.yahoo.co.jp/search/${encoded}`,
      surugaya_url: `https://www.suruga-ya.jp/search?search_word=${encoded}`,
      hardoff_url: `https://netmall.hardoff.co.jp/search/?q=${encoded}`,
      generated_keywords: generated100Keywords, // 100個のキーワード配列を保存
      created_at: new Date().toISOString()
    }

    await supabase.from('surging_items').insert([dbData])

    return NextResponse.json({
      success: true,
      target: targetTrend,
      keyword_count: generated100Keywords.length,
      sample_keywords: generated100Keywords.slice(0, 10),
      item: dbData
    })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
