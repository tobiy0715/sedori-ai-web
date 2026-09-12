import os
import re
import json
import urllib.parse
import urllib.request
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
以下のニュース情報を元にせどり分析を行い、必ずJSONフォーマットのみで出力してください。

ニュース文面: {title}
抽出済みの仮商品名: {pure_name}

出力するJSON構造:
{{
  "item_title": "メルカリ検索用の完全な商品名（例：しまむら ちいかわ コラボ）",
  "score": 85,
  "rank": "A",
  "category": "アパレル",
  "purchase_price": 3000,
  "expected_profit": 2000,
  "ai_comment": "【買い】初動の需要が高いため即出品で利益確定可能。"
}}
"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        res_json = json.loads(text)
        
        if not res_json.get("item_title") or len(res_json.get("item_title")) > 25:
            res_json["item_title"] = pure_name
            
        return res_json
    except Exception as e:
        print(f"Gemini解析エラー詳細: {e}")
        return {
            "item_title": pure_name,
            "score": 70,
            "rank": "A",
            "category": "ホビー",
            "purchase_price": 2000,
            "expected_profit": 1500,
            "ai_comment": "【買い】トレンド急上昇中。早めの市場確認を推奨。"
        }

def run_scraper():
    delete_old_items()

    keywords = "コラボ 限定 プレミアム 予約 抽選"
    encoded_keywords = urllib.parse.quote(keywords)
    rss_url = f"[https://news.google.com/rss/search?q=](https://news.google.com/rss/search?q=){encoded_keywords}&hl=ja&gl=JP&ceid=JP:ja"
    
    req = urllib.request.Request(rss_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()

    root = ET.fromstring(xml_data)
    items = root.findall('.//item')

    for item in items[:3]:
        raw_title = item.find('title').text
        
        ai_data = analyze_with_gemini(raw_title)
        clean_name = ai_data.get("item_title", "トレンド商品")
        
        encoded_search = urllib.parse.quote(clean_name)
        mercari_url = f"[https://jp.mercari.com/search?keyword=](https://jp.mercari.com/search?keyword=){encoded_search}"
        
        data = {
            "item_title": clean_name,
            "url": mercari_url,
            "score": int(ai_data.get("score", 70)),
            "rank": str(ai_data.get("rank", "A")),
            "category": str(ai_data.get("category", "その他")),
            "purchase_price": int(ai_data.get("purchase_price", 2000)),
            "expected_profit": int(ai_data.get("expected_profit", 1500)),
            "ai_comment": str(ai_data.get("ai_comment", "【買い】要チェック")),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            supabase.table("surging_items").insert(data).execute()
            print(f"解析＆保存成功: {clean_name}")
        except Exception as db_err:
            print(f"DB保存エラー: {db_err}")

if __name__ == "__main__":
    run_scraper()
