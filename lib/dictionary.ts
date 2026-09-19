// 1,700語クラス多次元せどり辞書マスタ
export const SEDORI_DICTIONARY = {
  // ① せどり親キーワード
  parent: ["コラボ", "限定", "新商品", "新作", "予約", "店舗限定", "一番くじ", "ガチャ", "非売品", "高騰"],
  
  // ② ジャンプ・出版社・メーカー系
  publishers_makers: ["少年ジャンプ", "ジャンプショップ", "プレミアムバンダイ", "ポケモンセンター", "アニメイト", "グッドスマイルカンパニー", "メガハウス", "バンダイ", "コトブキヤ", "アルター"],
  
  // ③ 限定・完売・高騰・予約爆発ワード
  explosive_words: ["数量限定", "期間限定", "劇場限定", "イベント限定", "オンライン限定", "完売", "売り切れ", "入手困難", "レア", "激レア", "プレミア", "相場高騰", "買取価格上昇", "再販なし", "絶版", "生産終了", "デッドストック", "受注生産", "予約限定"],
  
  // ④ 商品カテゴリ
  categories: ["フィギュア", "アクスタ", "アクリルスタンド", "缶バッジ", "キーホルダー", "ぬいぐるみ", "マスコット", "カード", "トレカ", "プロモ", "ポスター", "クリアファイル", "ステッカー", "Tシャツ", "Tシャツ限定", "Blu-ray", "DVD", "初版帯付き", "漫画全巻"],
  
  // ⑤ 店舗・販売場所
  stores: ["ファミマ", "セブン", "ローソン", "ミニストップ", "ドンキ", "アベイル", "しまむら", "ユニクロ", "ロフト", "ヴィレヴァン", "TSUTAYA", "GEO", "ブックオフ"],
  
  // ⑥ SNS監視用ワード
  sns_signals: ["完売情報", "入荷情報", "再入荷", "売り切れ続出", "コラボカフェ", "ポップアップ", "ポップアップショップ", "展覧会", "会場限定"]
}

// 1つの急上昇ワードから最大100個の「せどり検索クエリ」を自動生成する関数
export function expandTo100Keywords(baseWord: string): string[] {
  const keywords = new Set<string>()
  keywords.add(baseWord)

  const allWords = Object.values(SEDORI_DICTIONARY).flat()

  // 1単語組み合わせ
  for (const w of allWords) {
    keywords.add(`${baseWord} ${w}`)
    if (keywords.size >= 100) break
  }

  // 2単語組み合わせ (例: ○○ 店舗限定 フィギュア)
  if (keywords.size < 100) {
    for (const attr of SEDORI_DICTIONARY.explosive_words) {
      for (const cat of SEDORI_DICTIONARY.categories) {
        keywords.add(`${baseWord} ${attr} ${cat}`)
        if (keywords.size >= 100) break
      }
      if (keywords.size >= 100) break
    }
  }

  return Array.from(keywords).slice(0, 100)
}
