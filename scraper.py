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

def fetch_shopping_trends():
    """
    価格.comやYahooニュース(IT/ガジェット/ゲーム)などから
    具体的な商品・メーカーが載っているニュース・トレンドを取得
    """
    topics = []
    
    # 1. Yahoo!ニュース（IT・科学・ゲームカテゴリ）から新製品ニュースを取得
    try:
        url = "https://news.yahoo.co.jp/categories/it"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            for a in soup.find_all('a', href=True):
                text = a.get_text().strip()
                if 10 < len(text) < 40 and any(k in text for k in ["発売", "限定", "新型", "コラボ", "カード", "iPhone", "Switch", "PS5", "フィギュア"]):
                    if text not in topics:
                        topics.append(text)
    except Exception as e:
        print(f"ニュース取得エラー: {e}")

    # トピックが少ない場合の予備（物販ジャンルのカテゴリ名）
    if len(topics) < 5:
        topics.extend([
            "Nintendo Switch 2 本体",
            "ポケモンカードゲーム ハイクラスパック",
            "PlayStation 5 Pro",
            "iPhone 16 Pro 256GB",
            "一一番くじ ドラゴンボール 限定フィギュア"
        ])
        
    return list(set(topics))[:5]

def analyze_item_with_ai(topic_seed):
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    あなたはメルカリ・店舗せどり（ハードオフ・ブックオフ・駿河屋）の超プロリサーチャーです。
    以下のニュース/トレンド要素から、現在〜直近で【実際に市場で売買されている、型番やメーカー名まで含んだ具体的な利益商品名】を1つ特定してください。

    【トレンドのヒント】: {topic_seed}

    ■ 絶対ルール:
    1. 「限定ホビーフィギュア」「ゲーム機本体」「カード」のような【抽象的なカテゴリ名・一般名詞は絶対に禁止】です。
    2. 必ず「メーカー名 + シリーズ名 + 型番/モデル名/カラー/限定名」などの【店舗やメルカリで一発検索できる具体的な名称】にしてください。
       (良い例: "ソニー WF-1000XM5 ブラック", "バンダイ S.H.Figuarts 仮面ライダー第2号", "任天堂 Nintendo Switch Lite ハイラルエディション")
    3. 実在しない架空の型番は作らず、実在する人気モデルを厳密に出力してください。

    ■ 出力フォーマット (必ず純粋なJSON形式のみで出力):
    {{
      "target_item": "メーカー名・型番・シリーズ名を含めた具体的商品名",
      "category": "ゲーム / ホビー / トレカ / ガジェット / アパレル / 家電",
      "purchase_price": 3000,
      "avg_sold_price": 6800,
      "expected_profit": 2500,
      "sales_speed": "即売れ（24h以内）",
      "risk_level": "安全",
      "judgment": "買い",
      "reason": "【判定: 買い】メルカリでの高値落札実績が多数あり、ハードオフ・ブックオフ等の中古相場差額で利益が出やすいため。"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r'```json|```', '', text).strip()
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            item_name = data.get("target_item", "")
            
            # 「限定」「フィギュア」「ゲーム」等だけの抽象ワードが含まれていたらNGとして補正・除外
            banned_abstract_words = ["限定ホビー", "最新モデル", "人気フィギュア", "トレンド商品", "ゲームソフト"]
            if not any(bad in item_name for bad in banned_abstract_words) and len(item_name) >= 6:
                return data
    except Exception as e:
        print(f"AI解析エラー: {e}")
    
    return None

def run_scraper():
    print("=== 具体商品名特化 リサーチ開始 ===")
    seeds = fetch_shopping_trends()

    inserted_count = 0
    for seed in seeds:
        ai_res = analyze_item_with_ai(seed)
        if not ai_res:
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
            "rank": "S" if expected_profit >= 4000 else "A",
            "score": 90 if expected_profit >= 4000 else 75,
            "category": category,
            "purchase_price": purchase_price,
            "avg_sold_price": avg_sold_price,
            "expected_profit": expected_profit,
            "sales_speed": sales_speed,
            "risk_level": risk_level,
            "ai_comment": ai_comment,
            "source_url": "https://news.yahoo.co.jp/categories/it",
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
        print(f"✅ 精密保存完了: [{category}] {item_title}")
        inserted_count += 1

    print(f"=== 完了: {inserted_count} 件の具体的商品データを格納しました ===")

if __name__ == "__main__":
    run_scraper()
