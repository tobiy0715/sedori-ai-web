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

def fetch_real_trending_keywords():
    """
    今まさに検索・リサーチされているリアルな商品関連キーワードを収集する
    """
    keywords = []
    
    # 1. Googleトレンド（日本国内のリアルタイム急上昇キーワード）
    try:
        url = "https://trends.google.co.jp/trends/trendingsearches/daily/rss?geo=JP"
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.content, 'xml')
            items = soup.find_all('item')
            for item in items:
                title = item.find('title').get_text().strip()
                if title and len(title) > 2:
                    keywords.append(title)
    except Exception as e:
        print(f"Google Trends取得エラー: {e}")

    # 2. 補完用：Yahoo!リアルタイム検索（話題のワード）
    if len(keywords) < 5:
        try:
            url = "https://search.yahoo.co.jp/realtime"
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, 'html.parser')
                # 話題のキーワード要素を抽出
                for a in soup.select('a[href*="/realtime/search"]'):
                    text = a.get_text().strip()
                    if text and len(text) >= 2 and text not in keywords:
                        keywords.append(text)
        except Exception as e:
            print(f"Yahooリアルタイム取得エラー: {e}")

    # 重複除去して抽出
    unique_keywords = list(dict.fromkeys(keywords))
    return unique_keywords[:5]

def analyze_item_with_ai(keyword):
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    あなたはメルカリ・Amazon・ヤフオクのプロの物販アナリストです。
    以下の急上昇トレンドキーワードから、せどり・転売・プレミア化で【実際に市場で高値取引されている具体的商品名】を1つ特定・推測してください。

    【トレンドキーワード】: {keyword}

    ■ 指示事項:
    1. 「限定ホビーフィギュア」のような抽象的な表現は絶対に避け、メーカー名・型番・シリーズ名・限定版などの【具体的な商品名】を出力してください。
    2. ゲーム、ポケカ/遊戯王、フィギュア、限定スニーカー、Apple製品、レトロPC/ゲーム、コラボグッズなどを優先してください。
    3. 価格感・利益・回転スピード・真贋リスクをリアルに見積もってください。

    ■ 出力フォーマット (必ず純粋なJSON形式のみで出力):
    {{
      "target_item": "具体的なメーカー名・型番・商品名（例：PlayStation 5 Pro 30周年記念モデル）",
      "category": "ゲーム / ホビー / トレカ / ガジェット / アパレル",
      "purchase_price": 定価や見込み仕入れ値(数字のみ),
      "avg_sold_price": メルカリ等での平均売価(数字のみ),
      "expected_profit": 見込み利益(数字のみ),
      "sales_speed": "即売れ（24h以内）" または "やや早い（2〜3日）" または "標準（1週間以内）",
      "risk_level": "安全" または "⚠️ 真贋規制注意" または "🚫 出品制限あり",
      "judgment": "買い" または "見送り" または "微妙",
      "reason": "【判定: 買い】〇〇の理由によりメルカリ相場が高騰中。"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r'```json|```', '', text).strip()
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            # 「限定ホビー」などの抽象ワードが含まれていたら弾いて補正
            if "限定ホビー" not in data.get("target_item", ""):
                return data
    except Exception as e:
        print(f"AI解析エラー ({keyword}): {e}")
    
    return None

def run_scraper():
    print("=== リアル自動リサーチ スクリプト開始 ===")
    trending_keywords = fetch_real_trending_keywords()
    print(f"取得したトレンドワード: {trending_keywords}")

    inserted_count = 0
    for kw in trending_keywords:
        ai_res = analyze_item_with_ai(kw)
        if not ai_res or not ai_res.get("target_item"):
            continue

        item_title = ai_res.get("target_item")
        category = ai_res.get("category", "その他")
        purchase_price = int(ai_res.get("purchase_price", 0))
        avg_sold_price = int(ai_res.get("avg_sold_price", 0))
        expected_profit = int(ai_res.get("expected_profit", 0))
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
        keepa_url = f"https://keepa.com/#!search/5-{encoded_title}"

        record = {
            "item_title": item_title,
            "rank": "A" if expected_profit > 3000 else "B",
            "score": 85 if expected_profit > 3000 else 70,
            "category": category,
            "purchase_price": purchase_price,
            "avg_sold_price": avg_sold_price,
            "expected_profit": expected_profit,
            "sales_speed": sales_speed,
            "risk_level": risk_level,
            "ai_comment": ai_comment,
            "source_url": f"https://www.google.com/search?q={urllib.parse.quote(kw)}",
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
        print(f"✅ 実戦データ保存完了: [{category}] {item_title} (見込み利益: ¥{expected_profit})")
        inserted_count += 1

    print(f"=== 完了: {inserted_count} 件のリアル商品を収集しました ===")

if __name__ == "__main__":
    run_scraper()
