import os
import re
import json
import urllib.parse
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

def fetch_realtime_hobby_manga_trends():
    """
    Amazon/Yahooニュース等からホビー・フィギュア・漫画・トレカの
    リアルタイム急上昇キーワード・話題商品を動的にスクレイピング
    """
    targets = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    # 1. Yahoo!ニュース (アニメ・ホビー・ゲーム関連トレンド)
    try:
        url = "https://news.yahoo.co.jp/categories/subculture"
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            for a in soup.find_all('a', href=True):
                text = a.get_text().strip()
                if 8 < len(text) < 40 and any(k in text for k in ["フィギュア", "一番くじ", "限定", "カード", "コミック", "プラモ", "発売"]):
                    if text not in targets:
                        targets.append(text)
    except Exception as e:
        print(f"[Scrape Error] Yahoo Subculture: {e}")

    # 2. 予備/フォールバック: ホビー・漫画・ゲームの実戦カテゴリシード
    fallback_seeds = [
        "S.H.Figuarts ドラゴンボール 限定フィギュア",
        "ワンピース ONE PIECE カードゲーム 新弾 BOX",
        "ポケモンカードゲーム ハイクラスパック",
        "メガハウス G.E.M. シリーズ フィギュア",
        "初音ミク 1/7 スケールフィギュア 限定版",
        "特装版 コミック 完売品",
        "METAL BUILD ガンダム プレミアモデル"
    ]

    combined = targets + fallback_seeds
    unique_targets = list(dict.fromkeys(combined))
    return unique_targets[:5]


def run_multi_ai_debate(seed_keyword):
    """
    マルチAIディベート（強気派 vs 慎重派 vs 審判AI）による精密検証
    """
    model = genai.GenerativeModel('gemini-1.5-flash')

    # -------------------------------------------------------------
    # 段階1: 具体的商品名の抽出 ＆ 強気派（利益追求派）分析
    # -------------------------------------------------------------
    prompt_bull = f"""
    あなたはメルカリ・Amazon・ヤフオクの「利益追求型せどりプロアナリスト」です。
    キーワード【{seed_keyword}】に関連する、ホビー・フィギュア・漫画・トレカ分野で【現在実際にプレ値・高値取引されている具体的な商品名・型番】を1つ特定し、強気の視点で分析してください。

    ■ 指示:
    - 抽象名詞（「限定フィギュア」等）は禁止。必ずメーカー名や作品名、型番を含めた具体的商品名を出力すること。
    - この商品がなぜ即売れし、利益が出るかの強気な根拠を挙げてください。
    """
    
    try:
        res_bull = model.generate_content(prompt_bull).text
    except Exception as e:
        print(f"[AI Error] Bull Agent: {e}")
        return None

    # -------------------------------------------------------------
    # 段階2: 慎重派（リスク管理派）分析
    # -------------------------------------------------------------
    prompt_bear = f"""
    あなたは物販の「リスク管理・偽物・暴落警戒の専門家」です。
    以下の【強気派アナリストの分析】に対して厳しく反論・リスク指摘を行ってください。

    【強気派の分析】:
    {res_bull}

    ■ 指示:
    - 再販（再生産）による価格暴落リスク
    - メルカリ・ヤフオクでの出品者激増による値崩れ懸念
    - 偽物（海賊版）リスクやフリマアプリでの出品規制
    上記を踏まえた慎重なリスク評価を行ってください。
    """
    
    try:
        res_bear = model.generate_content(prompt_bear).text
    except Exception as e:
        print(f"[AI Error] Bear Agent: {e}")
        return None

    # -------------------------------------------------------------
    # 段階3: 審判AI（両者の議論を統合して最終ジャッジメント）
    # -------------------------------------------------------------
    prompt_judge = f"""
    あなたは最高権威の物販審判AI（ディベート統括）です。
    「強気派の利益評価」と「慎重派のリスク指摘」の2つの議論を比較検証し、最終的な統計スコアと判定を下してください。

    【強気派の主張】:
    {res_bull}

    【慎重派の主張】:
    {res_bear}

    ■ 出力必須フォーマット (必ず純粋なJSON形式のみで出力):
    {{
      "item_title": "メーカー名・作品名・型番を含む具体的商品名",
      "category": "ホビー / コミック / トレカ / ゲーム",
      "purchase_price": 仕入れ見込み額(数字のみ),
      "avg_sold_price": フリマ相場平均(数字のみ),
      "expected_profit": 見込み利益(数字のみ),
      "score": 0〜100の統計スコア(数字のみ),
      "rank": "S" または "A" または "B" または "C",
      "sales_speed": "即売れ（24h以内）" または "やや早い（2〜3日）" または "標準（1週間以内）",
      "risk_level": "安全" または "⚠️ 真贋規制注意" または "🚫 出品制限あり",
      "judgment": "買い" または "見送り" または "微妙",
      "debate_summary": "【審判AI判定】強気派の〇〇という点と、慎重派の〇〇というリスクを総合評価。結論として〜"
    }}

    ※ スコア/ランク基準:
    - Sランク (90-100点): 利益率30%以上かつ即売れ、再販リスク低
    - Aランク (75-89点): 利益率20%以上、3日以内売れ
    - Bランク (60-74点): 利益可だが回転標準
    - Cランク (59点以下): 暴落懸念・リスク高
    """

    try:
        res_judge = model.generate_content(prompt_judge).text
        text = res_judge.strip()
        text = re.sub(r'```json|```', '', text).strip()
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        print(f"[AI Error] Judge Agent: {e}")

    return None


def run_scraper():
    print("=== 🚀 5〜10分周期型 マルチAIディベートせどりリサーチ開始 ===")
    seeds = fetch_realtime_hobby_manga_trends()

    inserted_count = 0
    for seed in seeds:
        print(f"\n🔍 リサーチ種別: {seed}")
        debate_result = run_multi_ai_debate(seed)
        
        if not debate_result or not debate_result.get("item_title"):
            continue

        item_title = debate_result.get("item_title")
        category = debate_result.get("category", "ホビー")
        purchase_price = int(debate_result.get("purchase_price", 0))
        avg_sold_price = int(debate_result.get("avg_sold_price", 0))
        expected_profit = int(debate_result.get("expected_profit", 0))
        score = int(debate_result.get("score", 70))
        rank = debate_result.get("rank", "B")
        sales_speed = debate_result.get("sales_speed", "標準（1週間以内）")
        risk_level = debate_result.get("risk_level", "安全")
        ai_comment = debate_result.get("debate_summary", "")

        # URLエンコード処理
        encoded_title = urllib.parse.quote(item_title)
        mercari_url = f"https://jp.mercari.com/search?keyword={encoded_title}&status=on_sale"
        amazon_url = f"https://www.amazon.co.jp/s?k={encoded_title}"
        yahoo_url = f"https://paypayfleamarket.yahoo.co.jp/search/{encoded_title}"
        surugaya_url = f"https://www.suruga-ya.jp/search?search_word={encoded_title}"
        hardoff_url = f"https://netmall.hardoff.co.jp/search/?q={encoded_title}"
        bookoff_url = f"https://likebit.bookoff.co.jp/search/result?q={encoded_title}"
        keepa_url = f"https://keepa.com/#!search/5-{encoded_title}"

        record = {
            "item_title": item_title,
            "rank": rank,
            "score": score,
            "category": category,
            "purchase_price": purchase_price,
            "avg_sold_price": avg_sold_price,
            "expected_profit": expected_profit,
            "sales_speed": sales_speed,
            "risk_level": risk_level,
            "ai_comment": ai_comment,
            "source_url": mercari_url,
            "mercari_url": mercari_url,
            "amazon_url": amazon_url,
            "yahoo_url": yahoo_url,
            "surugaya_url": surugaya_url,
            "hardoff_url": hardoff_url,
            "bookoff_url": bookoff_url,
            "keepa_url": keepa_url,
            "created_at": datetime.utcnow().isoformat()
        }

        supabase.table("surging_items").insert(record).execute()
        print(f"✨【精査完了】 [{rank}ランク/{score}点] {item_title} (見込み利益: ¥{expected_profit})")
        inserted_count += 1

    print(f"\n=== 🎉 完了: {inserted_count} 件の最高粒度マルチAI精査データを格納しました ===")

if __name__ == "__main__":
    run_scraper()
