import os
import re
import json
import urllib.parse
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai
from supabase import create_client, Client

# --- 設定・初期化 ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

def fetch_trending_topics():
    """ウェブ上の最新ニュースやトレンドからキーワードを自動取得する"""
    items = []
    try:
        # 例としてYahoo!ニュースのヘッドラインをスクレイピング
        url = "https://news.yahoo.co.jp/"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            links = soup.find_all('a', limit=20)
            for link in links:
                text = link.get_text().strip()
                if len(text) > 6: # ある程度の長さがある見出しを対象
                    items.append({
                        "title": text,
                        "rank": "A",
                        "score": 75,
                        "url": link.get('href', url)
                    })
    except Exception as e:
        print(f"スクレイピングエラー: {e}")
    
    # 取得できなかった場合のフォールバック
    if not items:
        items = [
            {"title": "最新トレンド商品トレンド調査", "rank": "B", "score": 60, "url": "https://news.yahoo.co.jp/"}
        ]
    return items[:5] # 上位5件に絞る

def analyze_item_with_ai(item_title):
    """取得したニュースからせどり対象商品をAIに推測・解析させる"""
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    あなたはプロのせどり・転売アナリストです。
    以下のニュース見出し・キーワードを分析し、この話題に関連して転売やせどりで需要が急上昇しそうな具体的な商品名を1つ挙げ、カテゴリーと仕入判定を行ってください。

    【対象ニュース/キーワード】: {item_title}

    ■ カテゴリー選択肢（以下の中から最も適切なものを1つだけ厳密に選んでください）:
    - ゲーム
    - 家電・ガジェット
    - トレーディングカード
    - ホビー
    - アパレル・ブランド
    - コスメ・美容
    - 日用品・食品
    - その他

    ■ 出力フォーマット (必ず以下の純粋なJSON形式のみで出力してください):
    {{
      "target_item": "せどり対象となる具体的な商品名（例：PlayStation 5 Pro など）",
      "category": "選択したカテゴリー名",
      "purchase_price": 定価や相場に基づく推定仕入れ価格(半角数値のみ),
      "expected_profit": 推定見込み利益(半角数値のみ),
      "judgment": "買い" または "見送り" または "微妙",
      "reason": "短い根拠・理由（50文字程度）"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return data
    except Exception as e:
        print(f"AI解析エラー: {e}")
    
    return {
        "target_item": item_title,
        "category": "その他",
        "purchase_price": 3000,
        "expected_profit": 500,
        "judgment": "微妙",
        "reason": "自動解析データの抽出に失敗しました。"
    }

def run_scraper():
    print("=== リアルタイム自動スクレイピング＆AI解析開始 ===")
    trending_items = fetch_trending_topics()

    for target in trending_items:
        raw_title = target["title"]
        ai_res = analyze_item_with_ai(raw_title)
        
        item_title = ai_res.get("target_item", raw_title)
        category = ai_res.get("category", "その他")
        purchase_price = ai_res.get("purchase_price", 0)
        expected_profit = ai_res.get("expected_profit", 0)
        judgment = ai_res.get("judgment", "微妙")
        reason = ai_res.get("reason", "")
        
        ai_comment = f"【判定: {judgment}】 {reason}"

        encoded_title = urllib.parse.quote(item_title)
        mercari_url = f"https://jp.mercari.com/search?keyword={encoded_title}&status=on_sale"
        amazon_url = f"https://www.amazon.co.jp/s?k={encoded_title}"
        yahoo_url = f"https://paypayfleamarket.yahoo.co.jp/search/{encoded_title}"

        record = {
            "item_title": item_title,
            "rank": target["rank"],
            "score": target["score"],
            "category": category,
            "purchase_price": purchase_price,
            "expected_profit": expected_profit,
            "ai_comment": ai_comment,
            "source_url": target["url"],
            "mercari_url": mercari_url,
            "amazon_url": amazon_url,
            "yahoo_url": yahoo_url,
            "created_at": datetime.utcnow().isoformat()
        }

        supabase.table("surging_items").insert(record).execute()
        print(f"自動保存完了: [{category}] {item_title} (判定: {judgment})")

if __name__ == "__main__":
    run_scraper()
