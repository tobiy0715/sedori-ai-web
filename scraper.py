import os
import re
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone
import google.generativeai as genai
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

def delete_old_items():
    three_days_ago = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    try:
        supabase.table("surging_items").delete().lt("created_at", three_days_ago).execute()
        print("過去データをクリーンアップしました")
    except Exception as e:
        print(f"クリーンアップスキップ: {e}")

def fetch_yahoo_trending_keywords():
    """Yahoo!フリマから検索急上昇ワードを取得（強力フォールバック付き）"""
    url = "https://paypayfleamarket.yahoo.co.jp/"
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept-Language": "ja-JP,ja;q=0.9"
    }
    keywords = []
    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, 'html.parser')
            elements = soup.find_all(['a', 'span', 'p', 'div'])
            for el in elements:
                text = el.text.strip()
                if text and 3 <= len(text) <= 30:
                    if not any(ignore in text for ignore in ["ログイン", "ヘルプ", "利用規約", "カテゴリ", "出品", "マイページ", "検索", "利用規約", "プライバシー"]):
                        if any(k in text for k in ["ちいかわ", "一番くじ", "限定", "マスコット", "フィギュア", "カード", "ポケモン", "コラボ", "ぬいぐるみ"]):
                            keywords.append(text)
    except Exception as e:
        print(f"Yahoo急上昇取得エラー: {e}")
    
    unique_kw = list(dict.fromkeys(keywords))
    
    # スクレイピングで取れなかった場合はGeminiでフリマトレンドを補正・生成
    if not unique_kw:
        print("Yahoo!フリマ直接取得が空のため、AIトレンド補正を作動させます")
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = """
現在、日本のフリマアプリ（Yahoo!フリマやメルカリ）で【検索急上昇中】または【SOLD OUT（売り切れ）連発中】の注目のトレンド商品・キーワードを5つ提案してください。
例: ちいかわ りんりんおかおマスコット, ポケモンカード 最新パック, 一番くじ フィギュア
カンマ区切りでキーワードのみを出力してください。余計な説明は一切不要です。
"""
            res = model.generate_content(prompt)
            ai_keywords = [k.strip() for k in res.text.split(",") if k.strip()]
            unique_kw = ai_keywords
        except Exception as e:
            print(f"AIトレンド生成エラー: {e}")
            unique_kw = [
                "ちいかわ りんりんおかおマスコット",
                "ポケモンカード MEGA 30th",
                "ONE PIECE フィギュア 限定",
                "一番くじ ラストワン賞",
                "サンリオ マスコット"
            ]

    return unique_kw[:5]

def analyze_trending_item_with_gemini(keyword):
    """急上昇ワードを元にメルカリ売り切れ相場と定価・利益額を推測"""
    prompt = f"""
あなたはプロのせどり・転売リサーチAIです。
現在フリマアプリで検索急上昇中のトレンドワード「{keyword}」について、
メルカリで『売り切れ（SOLD OUT）・新しい順』で高値取引されている具体的な商品情報を生成してください。

必ず以下のJSON形式「のみ」で出力し、前後にマークダウンや他の文章を一切含めないこと。

{{
  "item_title": "メルカリ・フリマでそのまま検索できる正確な商品名・型番",
  "category": "ホビー / アパレル / 家電 / グッズ のいずれか",
  "purchase_price": 3000,
  "market_price": 6500,
  "reason": "なぜ今メルカリでSOLD連発・急上昇しているのか（需要理由）"
}}
"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            text = match.group(0)
            
        res_json = json.loads(text)
        
        pur = int(res_json.get("purchase_price", 3000))
        mkt = int(res_json.get("market_price", 6000))
        if pur <= 0: pur = 3000
        if mkt <= pur: mkt = pur + 2500

        return {
            "item_title": str(res_json.get("item_title", keyword)),
            "category": str(res_json.get("category", "グッズ")),
            "purchase_price": pur,
            "market_price": mkt,
            "reason": str(res_json.get("reason", "フリマ検索急上昇＆SOLD連発中"))
        }
    except Exception as e:
        print(f"Gemini解析エラー: {e}")
        return {
            "item_title": keyword,
            "category": "グッズ",
            "purchase_price": 3000,
            "market_price": 6500,
            "reason": "フリマ検索急上昇ワードからの自動抽出"
        }

def run_scraper():
    delete_old_items()

    # 1. Yahoo!フリマの急上昇ワードを取得
    trending_keywords = fetch_yahoo_trending_keywords()
    print(f"取得した急上昇ワード: {trending_keywords}")

    for kw in trending_keywords:
        ai_data = analyze_trending_item_with_gemini(kw)
        
        clean_name = ai_data["item_title"]
        purchase_price = ai_data["purchase_price"]
        market_price = ai_data["market_price"]
        
        platform_fee = int(market_price * 0.10)
        shipping_fee = 700
        net_profit = market_price - purchase_price - platform_fee - shipping_fee
        profit_margin = round((net_profit / market_price) * 100, 1) if market_price > 0 else 0
        
        if profit_margin >= 15 and net_profit > 800:
            judgment = "即仕入れ"
            score = 90
            rank = "S"
        elif profit_margin >= 5:
            judgment = "要検討"
            score = 70
            rank = "A"
        else:
            judgment = "見送り"
            score = 40
            rank = "B"

        encoded_search = requests.utils.quote(clean_name)
        
        # メルカリ：「売り切れ（status=sold_out）」「新しい順（sort=created_time&order=desc）」指定URL
        mercari_sold_url = f"https://jp.mercari.com/search?keyword={encoded_search}&status=sold_out&sort=created_time&order=desc"
        yahoo_url = f"https://paypayfleamarket.yahoo.co.jp/search?keyword={encoded_search}"
        amazon_url = f"https://www.amazon.co.jp/s?k={encoded_search}"
        
        calc_details = f"売値:{market_price:,} - 仕入:{purchase_price:,} - 手数料:{platform_fee} - 送料:{shipping_fee}"
        ai_comment = f"【🔥急上昇 / {judgment} / 利益率:{profit_margin}%】{ai_data['reason']} ({calc_details})"

        data = {
            "item_title": clean_name,
            "url": mercari_sold_url,
            "mercari_url": mercari_sold_url,
            "amazon_url": amazon_url,
            "yahoo_url": yahoo_url,
            "source_url": yahoo_url,
            "score": score,
            "rank": rank,
            "category": str(ai_data["category"]),
            "purchase_price": purchase_price,
            "expected_profit": net_profit,
            "ai_comment": ai_comment
        }
        
        try:
            supabase.table("surging_items").insert(data).execute()
            print(f"保存成功 [{judgment}]: {clean_name}")
        except Exception as db_err:
            print(f"DB保存エラー: {db_err}")

if __name__ == "__main__":
    run_scraper()
