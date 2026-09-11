import os
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def clean_title(title):
    # 「 - 〇〇ニュース」などのサイト名を削除
    title = re.sub(r' - [^-]+$', '', title)
    # 特殊記号を削除して検索ワードを生成
    title = re.sub(r'[【】「」『』🚨🔥🎁]', ' ', title)
    return title.strip()

def delete_old_items():
    # 3日前の日時を計算 (ISOフォーマット)
    three_days_ago = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    try:
        # created_at が3日前より古いレコードを削除
        supabase.table("surging_items").delete().lt("created_at", three_days_ago).execute()
        print("古くなった過去データを自動お掃除しました！")
    except Exception as e:
        print(f"クリーンアップ失敗 (スキップします): {e}")

def run_scraper():
    # 1. まずは古いデータを削除してお掃除
    delete_old_items()

    # 2. 検索キーワードで最新トレンドを取得
    keywords = "(コラボ OR 限定 OR ポップアップ OR 抽選 OR 受注生産) AND (即完売 OR 争奪戦 OR プレ値 OR 高騰)"
    encoded_keywords = urllib.parse.quote(keywords)
    rss_url = f"https://news.google.com/rss/search?q={encoded_keywords}&hl=ja&gl=JP&ceid=JP:ja"
    
    req = urllib.request.Request(rss_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()

    root = ET.fromstring(xml_data)
    items = root.findall('.//item')

    # 3. 最新5件を書き込み
    for item in items[:5]:
        raw_title = item.find('title').text
        cleaned = clean_title(raw_title)
        
        encoded_search = urllib.parse.quote(cleaned)
        mercari_url = f"https://jp.mercari.com/search?keyword={encoded_search}"
        
        data = {
            "item_title": f"🚨【急高騰・限定】{raw_title}",
            "url": mercari_url
        }
        
        supabase.table("surging_items").insert(data).execute()
        print(f"保存成功: {raw_title}")

if __name__ == "__main__":
    run_scraper()
