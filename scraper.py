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
以下のニュースタイトルを分析し、JSON形式のみで結果を返してください。余計な文章やマークダウンのバッククォート（```）は含めないこと。

ニュースタイトル: {title}

【最重要ルール】
- "item_title": ニュースのタイトルから、メルカリ等で検索するための「具体的なブランド名や商品名・コラボ名」を必ず抽出してください（例：「くまモン シール」「ちいかわ しまむら」など。「限定コラボグッズ」のような抽象的な表現は一切禁止です）。
- "score": 1から100までの整数（プレ値化しやすさ）
- "rank": "SS", "A", "B" のいずれか
- "category": "ホビー", "アパレル", "PC周辺機器", "トレカ", "音響", "その他" のいずれか
- "purchase_price": 推定仕入価格（円単位の数値）
- "expected_profit": 見込み利益額の整数
- "ai_forecast": 今後の価格推移の予測
- "ai_comment": 【買い】または【見送り】を明記した30字程度のアドバイス
"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        data = json.loads(text)
        
        # 抽象的な名前が返ってきた場合は例外に落としてフォールバックへ回す
        if not data.get("item_title") or "コラボグッズ" in data.get("item_title"):
            raise ValueError("具体的な商品名が抽出されていません")
        return data
    except Exception as e:
        print(f"Gemini解析エラー/フォールバック発動: {e}")
        # ニュースタイトルから不要な記号や煽り文句を削ってそのまま活かす
        clean_fallback = re.sub(r' - [^-]+$', '', title)
        clean_fallback = re.sub(r'[【】「」『』🚨🔥🎁1人1点即日完売]', ' ', clean_fallback).strip()
        return {
            "item_title": clean_fallback[:30] if clean_fallback else title[:30],
            "score": 60,
            "rank": "B",
            "category": "その他",
            "purchase_price": 2000,
            "expected_profit": 1000,
            "ai_forecast": "初動の需要に注目",
            "ai_comment": "【要確認】詳細な市場データをチェック"
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
        
        ai_data = analyze_with_gemini(raw_title)
        
        clean_name = ai_data.get("item_title") or raw_title[:30]
        encoded_search = urllib.parse.quote(clean_name)
        mercari_url = f"https://jp.mercari.com/search?keyword={encoded_search}"
        
        data = {
            "item_title": clean_name,
            "url": mercari_url,
            "score": int(ai_data.get("score", 60)),
            "rank": str(ai_data.get("rank", "B")),
            "category": str(ai_data.get("category", "その他")),
            "purchase_price": int(ai_data.get("purchase_price", 2000)),
            "expected_profit": int(ai_data.get("expected_profit", 1000)),
            "ai_comment": str(ai_data.get("ai_comment", "")),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            supabase.table("surging_items").insert(data).execute()
            print(f"解析＆保存成功: {clean_name}")
        except Exception as db_err:
            print(f"DB保存エラー: {db_err}")

if __name__ == "__main__":
    run_scraper()
