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
以下のニュースタイトルを「せどり・転売市場」の視点から分析し、JSON形式のみで結果を返してください。余計な文章やマークダウンのバッククォート（```）は一切含めないでください。

ニュースタイトル: {title}

出力するJSONのキー:
- "item_title": ニュースの見出しや装飾（「【急高騰】」や「- 日テレNEWS」など）を完全に排除し、フリマで検索しやすい純粋な「商品名・コラボ名」だけを抽出（例：「しまむら × ちいかわ コラボグッズ」）
- "score": 1から100までの整数（熱狂度・プレ値化しやすさ）
- "rank": "SS", "A", "B" のいずれか
- "category": "ホビー", "アパレル", "PC周辺機器", "トレカ", "音響", または "その他" のいずれか
- "purchase_price": 想定される定価や仕入価格の数値（円単位の整数。不明なら0）
- "expected_profit": 見込み利益額の整数（不明なら0）
- "ai_forecast": 今後の価格推移や需要の予測（簡潔に）
- "ai_comment": 「買い」または「見送り」を明記した、相棒からの鋭い一言アドバイス（30〜40文字程度）
"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception as e:
        print(f"Gemini解析エラー: {e}")
        return {
            "item_title": "トレンド商品",
            "score": 50,
            "rank": "B",
            "category": "その他",
            "purchase_price": 0,
            "expected_profit": 0,
            "ai_forecast": "市場の動向を要確認。",
            "ai_comment": "【見送り】情報が不足しています。"
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
        
        # Geminiに商品名クレンジングと分析を同時に依頼
        ai_data = analyze_with_gemini(raw_title)
        
        clean_name = ai_data.get("item_title", "限定アイテム")
        encoded_search = urllib.parse.quote(clean_name)
        mercari_url = f"https://jp.mercari.com/search?keyword={encoded_search}"
        
        data = {
            "item_title": clean_name,  # 綺麗な商品名だけを保存
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
