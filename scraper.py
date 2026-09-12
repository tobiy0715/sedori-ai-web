import os
import re
import json
import requests
import xml.etree.ElementTree as ET
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

def extract_pure_product_name(title):
    title = re.sub(r'\s*-\s*.*$', '', title)
    noise_patterns = [
        r'【[^】]*】', r'「[^」]*」', r'『[^』]*』',
        r'\d+万枚が即日完売.*?!', r'1人1点', r'対策も“争奪戦”', r'複数のフリマサイトに出品…',
        r'中国でも', r'販売', r'急高騰', r'限定', r'争奪戦', r'即完売'
    ]
    for pattern in noise_patterns:
        title = re.sub(pattern, '', title)
    return title.strip() or "注目トレンド商品"

def analyze_with_gemini(title):
    pure_name = extract_pure_product_name(title)
    
    prompt = f"""
以下のニュース情報を元に、プロのせどりバイヤーの視点で実際の市場価格と定価（仕入れ価格）をリアルに推測してください。
必ず以下の形式のJSONのみを出力し、前後に他の文章やマークダウンを含めないこと。

{{
  "item_title": "商品名（型番やコラボ名含む）",
  "category": "ホビー / アパレル / 家電 / グッズ のいずれか",
  "purchase_price": 定価や現実的な仕入原価の数値（例: 15000）,
  "market_price": "メルカリ等のフリマ実売価格の数値（例: 24000）",
  "reason": "なぜその価格で売れるかの理由を1文で"
}}

ニュース文面: {title}
"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # 確実にJSONブロックだけを抜き出す
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            text = match.group(0)
            
        res_json = json.loads(text)
        
        # 型の安全確保
        res_json["purchase_price"] = int(res_json.get("purchase_price", 5000))
        res_json["market_price"] = int(res_json.get("market_price", 8000))
        
        if not res_json.get("item_title") or len(res_json.get("item_title")) > 30:
            res_json["item_title"] = pure_name
            
        return res_json
    except Exception as e:
        print(f"Gemini解析エラー詳細: {e}")
        return {
            "item_title": pure_name,
            "category": "その他",
            "purchase_price": 5000,
            "market_price": 8000,
            "reason": "AI解析の補正値を使用"
        }

def run_scraper():
    delete_old_items()

    url_chars = [104, 116, 116, 112, 115, 58, 47, 47, 110, 101, 119, 115, 46, 103, 111, 111, 103, 108, 101, 46, 99, 111, 109, 47, 114, 115, 115, 47, 115, 101, 97, 114, 99, 104]
    rss_url = "".join([chr(c) for c in url_chars])

    params = {
        "q": "コラボ 限定 プレミアム 予約 抽選",
        "hl": "ja",
        "gl": "JP",
        "ceid": "JP:ja"
    }
    
    headers = {'User-Agent': 'Mozilla/5.0'}
    response = requests.get(rss_url, params=params, headers=headers)
    print(f"レスポンスステータス: {response.status_code}")

    root = ET.fromstring(response.content)
    items = root.findall('.//item')

    for item in items[:5]:
        raw_title = item.find('title').text
        ai_data = analyze_with_gemini(raw_title)
        
        clean_name = ai_data.get("item_title", "トレンド商品")
        purchase_price = ai_data.get("purchase_price", 5000)
        market_price = ai_data.get("market_price", 8000)
        
        # --- 厳格な利益計算ロジック ---
        platform_fee = int(market_price * 0.10)  # 販売手数料10%
        shipping_fee = 800                       # 送料・梱包費
        net_profit = market_price - purchase_price - platform_fee - shipping_fee
        profit_margin = round((net_profit / market_price) * 100, 1) if market_price > 0 else 0
        
        # 判定
        if profit_margin >= 20 and net_profit >= 2000:
            judgment = "即仕入れ"
            score = 90
            rank = "S"
        elif profit_margin >= 10:
            judgment = "要検討"
            score = 70
            rank = "A"
        else:
            judgment = "見送り"
            score = 30
            rank = "C"

        encoded_search = requests.utils.quote(clean_name)
        mercari_url = f"https://jp.mercari.com/search?keyword={encoded_search}"
        
        # 内訳がひと目でわかるコメントを作成
        calc_details = f"売値:{market_price:,} - 仕入:{purchase_price:,} - 手数料:{platform_fee} - 送料:{shipping_fee}"
        comment_text = ai_data.get('reason', '')
        ai_comment = f"【{judgment} / 利益率:{profit_margin}%】{comment_text} ({calc_details})"

        data = {
            "item_title": clean_name,
            "url": mercari_url,
            "score": score,
            "rank": rank,
            "category": str(ai_data.get("category", "その他")),
            "purchase_price": purchase_price,
            "expected_profit": net_profit,
            "ai_comment": ai_comment
        }
        
        try:
            supabase.table("surging_items").insert(data).execute()
            print(f"保存成功 [{judgment}]: {clean_name} (仕入:{purchase_price} / 利益:{net_profit}円 / 利益率:{profit_margin}%)")
        except Exception as db_err:
            print(f"DB保存エラー: {db_err}")

if __name__ == "__main__":
    run_scraper()
