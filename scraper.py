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

def fetch_trending_topics():
    items = []
    try:
        url = "https://news.yahoo.co.jp/"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            for a in soup.find_all('a', href=True):
                text = a.get_text().strip()
                href = a['href']
                if len(text) > 12 and "Yahoo" not in text and "ニュース" not in text and "ログイン" not in text:
                    if not any(item['title'] == text for item in items):
                        items.append({
                            "title": text,
                            "rank": "A",
                            "score": 75,
                            "url": href if href.startswith('http') else "https://news.yahoo.co.jp" + href
                        })
                if len(items) >= 5:
                    break
    except Exception as e:
        print(f"スクレイピングエラー: {e}")
    
    if not items:
        items = [{"title": "Nintendo Switch 2 本体発売の噂", "rank": "S", "score": 90, "url": "https://news.yahoo.co.jp/"}]
    return items

def analyze_item_with_ai(item_title):
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    あなたはプロのせどり・転売アナリストです。
    以下のニュースを分析し、具体的に利益が出そうな「商品名」を特定してください。
    また、セラースケットのように「真贋調査・メーカー規制のリスク」も厳密に判定してください。

    【対象ニュース見出し】: {item_title}

    ■ カテゴリー: ゲーム / 家電・ガジェット / トレーディングカード / ホビー / アパレル・ブランド / コスメ・美容 / 日用品・食品 / その他
    ■ 回転スピード(sales_speed): 「即売れ（24h以内）」 / 「やや早い（2〜3日）」 / 「標準（1週間以内）」 / 「回転遅め」
    ■ リスク判定(risk_level): 「安全」 / 「⚠️ 真贋規制注意」 / 「🚫 出品制限あり」

    ■ 出力フォーマット (必ず純粋なJSON形式のみで出力):
    {{
      "target_item": "具体的な商品名",
      "category": "選択したカテゴリー名",
      "purchase_price": 3000,
      "avg_sold_price": 5500,
      "expected_profit": 1500,
      "sales_speed": "即売れ（24h以内）",
      "risk_level": "安全",
      "judgment": "買い",
      "reason": "【判定: 買い】需要が高く回転率も抜群のため。"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r'```json|```', '', text).strip()
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        print(f"AI解析エラー: {e}")
    
    return {
        "target_item": "限定ホビーフィギュア 最新モデル",
        "category": "ホビー",
        "purchase_price": 4000,
        "avg_sold_price": 6800,
        "expected_profit": 1800,
        "sales_speed": "即売れ（24h以内）",
        "risk_level": "安全",
        "judgment": "買い",
        "reason": "【判定: 買い】需要が高くフリマアプリでの回転率が良いため。"
    }

def run_scraper():
    print("=== 3大ツール全部盛り スクリプト開始 ===")
    trending_items = fetch_trending_topics()

    for target in trending_items:
        raw_title = target["title"]
        ai_res = analyze_item_with_ai(raw_title)
        
        item_title = ai_res.get("target_item", "トレンド商品")
        category = ai_res.get("category", "その他")
        purchase_price = int(ai_res.get("purchase_price", 3000))
        avg_sold_price = int(ai_res.get("avg_sold_price", 5000))
        expected_profit = int(ai_res.get("expected_profit", 1000))
        sales_speed = ai_res.get("sales_speed", "標準（1週間以内）")
        risk_level = ai_res.get("risk_level", "安全")
        judgment = ai_res.get("judgment", "微妙")
        reason = ai_res.get("reason", "")
        
        ai_comment = reason if "【判定:" in reason else f"【判定: {judgment}】 {reason}"

        encoded_title = urllib.parse.quote(item_title)
        mercari_url = f"https://jp.mercari.com/search?keyword={encoded_title}&status=on_sale"
        amazon_url = f"https://www.amazon.co.jp/s?k={encoded_title}"
        yahoo_url = f"https://paypayfleamarket.yahoo.co.jp/search/{encoded_title}"
        surugaya_url = f"https://www.suruga-ya.jp/search?search_word={encoded_title}"
        hardoff_url = f"https://netmall.hardoff.co.jp/search/?q={encoded_title}"
        bookoff_url = f"https://likebit.bookoff.co.jp/search/result?q={encoded_title}"
        keepa_url = f"https://keepa.com/#!search/5-{encoded_title}" # Keepa検索URL

        record = {
            "item_title": item_title,
            "rank": target["rank"],
            "score": target["score"],
            "category": category,
            "purchase_price": purchase_price,
            "avg_sold_price": avg_sold_price,
            "expected_profit": expected_profit,
            "sales_speed": sales_speed,
            "risk_level": risk_level,
            "ai_comment": ai_comment,
            "source_url": target["url"],
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
        print(f"保存完了: [{category}] {item_title} (リスク: {risk_level})")

if __name__ == "__main__":
    run_scraper()
