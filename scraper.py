import os
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def clean_title(title):
    # 「 - 〇〇ニュース」などのサイト名を削除
    title = re.sub(r' - [^-]+$', '', title)
    # 特殊記号を削除してキーワードをスッキリさせる
    title = re.sub(r'[【】「」『』🚨🔥🎁]', ' ', title)
    return title.strip()

def run_scraper():
    keywords = "(コラボ OR 限定 OR ポップアップ OR 抽選 OR 受注生産) AND (即完売 OR 争奪戦 OR プレ値 OR 高騰)"
    encoded_keywords = urllib.parse.quote(keywords)
    rss_url = f"https://news.google.com/rss/search?q={encoded_keywords}&hl=ja&gl=JP&ceid=JP:ja"
    
    req = urllib.request.Request(rss_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()

    root = ET.fromstring(xml_data)
    items = root.findall('.//item')

    for item in items[:5]:
        raw_title = item.find('title').text
        cleaned = clean_title(raw_title)
        
        # メルカリ検索URLとAmazon検索URLを生成
        encoded_search = urllib.parse.quote(cleaned)
        mercari_url = f"https://jp.mercari.com/search?keyword={encoded_search}"
        amazon_url = f"https://www.amazon.co.jp/s?k={encoded_search}"
        
        # 既存のurlカラムにメルカリ検索URLを設定（メインの仕入れ先ボタン用）
        data = {
            "item_title": f"🚨【急高騰・限定】{raw_title}",
            "url": mercari_url
        }
        
        supabase.table("surging_items").insert(data).execute()
        print(f"保存成功（ワンタップリンク付）: {raw_title}")

if __name__ == "__main__":
    run_scraper()
