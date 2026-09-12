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

def analyze_with_gemini(title):
    prompt = f"""
以下のニュースタイトルをせどり・転売市場の視点から分析し、指定のJSONフォーマットで回答してください。

ニュースタイトル: {title}

期待するJSONフォーマット:
{{
  "item_title": "ニュースの雑多な見出し（【急高騰】やメディア名など）を排除した、メルカリ等で検索しやすい純粋な商品名・コラボ名",
  "score": 50,
  "rank": "B",
  "category": "ホビー",
  "purchase_price": 2000,
  "expected_profit": 1000,
  "ai_forecast": "初動高騰。再販リスクあり",
  "ai_comment": "【買い】または【見送り】を含めた30字程度のアドバイス"
}}
※rankは"SS","A","B"のいずれか。
※categoryは"ホビー","アパレル","PC周辺機器","トレカ","音響","その他"のいずれか。
"""
    try:
        # GeminiにJSON出力を強制する設定
        generation_config = {
            "response_mime_type": "application/json",
            "temperature": 0.2,
        }
        model = genai.GenerativeModel(
            'gemini-1.5-flash',
            generation_config=generation_config
        )
        response = model.generate_content(prompt)
        return json.loads(response.text.strip())
    except Exception as e:
        print(f"Gemini解析エラー: {e}")
        # エラー時も元のタイトルから最低限のノイズを除去してフォールバック
        clean_fallback = re.sub(r' - [^-]+$', '', title)
        clean_fallback = re.sub(r'[【】「」『』🚨🔥🎁]', ' ', clean_fallback).strip()
        return {
            "item_title": clean_fallback[:30],
            "score": 50,
            "rank": "B",
            "category": "その他",
            "purchase_price": 0,
            "expected_profit": 0,
            "ai_forecast": "要市場確認",
            "ai_comment": "【要確認】市場データを取得中"
        }

def run_scraper():
    delete_old_items()

    keywords = "(コラボ OR 限定 OR ポップアップ OR 抽選 OR 受注生産) AND (即完売 OR 争奪戦 OR プレ値 OR 高騰)"
    encoded_keywords = urllib.parse.quote(keywords)
    rss_url = f"https://news.google.com/rss/search?q={encoded_keywords}&hl=ja&gl=JP&ceid=JP:ja"
    
    req = urllib.request.Request(rss_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()

    root = ET.fromstring(xml_data)
    items = root.findall('.//item')

    for item in items[:3]:
        raw_title = item.find('title').text
        
        # Geminiでノイズ除去＆相棒分析を同時実行
        ai_data = analyze_with_gemini(raw_title)
        
        clean_name = ai_data.get("item_title") or "注目トレンド商品"
        encoded_search = urllib.parse.quote(clean_name)
        mercari_url = f"https://jp.mercari.com/search?keyword={encoded_search}"
        
        data = {
            "item_title": clean_name,
            "url": mercari_url,
            "score": ai_data.get("score", 50),
            "rank": ai_data.get("rank", "B"),
            "category": ai_data.get("category", "その他"),
            "purchase_price": ai_data.get("purchase_price", 0),
            "expected_profit": ai_data.get("expected_profit", 0),
            "ai_comment": ai_data.get("ai_comment", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        supabase.table("surging_items").insert(data).execute()
        print(f"解析＆保存成功: {clean_name}")

if __name__ == "__main__":
    run_scraper()
