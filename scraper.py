import os
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def run_scraper():
    # クロード提案の「販売形態」×「熱狂度」のかけ合わせクエリ
    # 販売形態: コラボ, 限定, ポップアップ, 抽選, 受注生産
    # 熱狂度: 即完売, 争奪戦, プレ値, 高騰
    keywords = "(コラボ OR 限定 OR ポップアップ OR 抽選 OR 受注生産) AND (即完売 OR 争奪戦 OR プレ値 OR 高騰)"
    encoded_keywords = urllib.parse.quote(keywords)
    rss_url = f"https://news.google.com/rss/search?q={encoded_keywords}&hl=ja&gl=JP&ceid=JP:ja"
    
    req = urllib.request.Request(rss_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()

    root = ET.fromstring(xml_data)
    items = root.findall('.//item')

    # 高精度なトレンド情報を最新5件取得して保存
    for item in items[:5]:
        title = item.find('title').text
        data = {"item_title": f"🚨【急高騰・限定】{title}"}
        
        supabase.table("surging_items").insert(data).execute()
        print(f"保存成功: {title}")

if __name__ == "__main__":
    run_scraper()
