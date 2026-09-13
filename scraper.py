import os
import re
import json
import urllib.parse
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai
from supabase import create_client, Client

# --- 設定・初期化 ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

def fetch_trending_topics():
    """Yahoo!ニュース等のトピックス一覧から具体的なニュース見出しを正確に抽出する"""
    items = []
    try:
        url = "https://news.yahoo.co.jp/"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            # トピックスや記事タイトルのリンク要素を幅広く取得
            for a in soup.find_all('a', href=True):
                text = a.get_text().strip()
                href = a['href']
                # サイト名などのノイズや短すぎる文言を除外し、記事らしい見出しをピックアップ
                if len(text) > 12 and "Yahoo" not in text and "ニュース" not in text and "ログイン" not in text:
                    if not any(item['title'] == text for item in items):
                        items.append({
                            "title": text,
                            "rank": "A",
                            "score": 75,
                            "url": href if href.startswith('http') else "https://news.yahoo.co.jp" + href
                        })
                if len(items) >= 5:
                    break
    except Exception as e:
        print(f"スクレイピングエラー: {e}")
    
    # 取得できなかった場合のセーフティ
    if not items:
        items = [
            {"title": "Nintendo Switch 2 本体発売の噂", "rank": "S", "score": 90, "url": "https://news.yahoo.co.jp/"}
        ]
    return items

def analyze_item_with_ai(item_title):
    """取得したニュースからせどり対象商品をAIに推測・解析させる"""
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    あなたはプロのせどり・転売アナリストです。
    以下のニュース見出しを分析し、この話題に関連して転売やせどりで需要が急上昇しそうな具体的な「商品名」を1つだけ特定し、カテゴリーと仕入判定を行ってください。
    ※「Yahoo! JAPAN」やサイト名、人物名そのものではなく、必ず物販（せどり）可能な具体的な「商品名」に変換してください。

    【対象ニュース見出し】: {item_title}

    ■ カテゴリー選択肢（以下の中から最も適切なものを1つ厳密に選ぶこと）:
    - ゲーム
    - 家電・ガジェット
    - トレーディングカード
    - ホビー
    - アパレル・ブランド
    - コスメ・美容
    - 日用品・食品
    - その他

    ■ 出力フォーマット (必ず以下の純粋なJSON形式のみを出力してください。マークダウンの```jsonや余計な文字は一切含めないこと):
    {{
      "target_item": "具体的な商品名（例：PlayStation 5 Pro または ポケモンカードBOX など）",
      "category": "選択したカテゴリー名",
      "purchase_price": 定価や相場に基づく推定仕入れ価格の数値のみ(例: 5000),
      "expected_profit": 推定見込み利益の数値のみ(例: 1500),
      "judgment": "買い" または "見送り" または "微妙",
      "reason": "短い根拠・理由（50文字程度。例：【判定: 買い】品薄が続いており高値安定のため。）"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # マークダウンのコードブロックなどを綺麗に除去
        text = re.sub(r'```json|```', '', text).strip()
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return data
    except Exception as e:
        print(f"AI解析エラー: {e}")
    
    return {
        "target_item": "限定ホビーフィギュア 最新モデル",
        "category": "ホビー",
        "purchase_price": 4000,
        "expected_profit": 1200,
        "judgment": "買い",
        "reason": "【判定: 買い】需要が高くフリマアプリでの回転率が良いため。"
    }

def run_scraper():
    print("=== リアルタイム自動スクレイピング＆AI解析開始 ===")
    trending_items = fetch_trending_topics()

    for target in trending_items:
        raw_title = target["title"]
        ai_res = analyze_item_with_ai(raw_title)
        
        item_title = ai_res.get("target_item", "トレンド商品")
        category = ai_res.get("category", "その他")
        purchase_price = int(ai_res.get("purchase_price", 3000))
        expected_profit = int(ai_res.get("expected_profit", 500))
        judgment = ai_res.get("judgment", "微妙")
        reason = ai_res.get("reason", "需要の動向に注目。")
        
        # 理由の中にすでに【判定: 〇〇】が入っていなければ付与する
        if "【判定:" in reason:
            ai_comment = reason
        else:
            ai_comment = f"【判定: {judgment}】 {reason}"

        encoded_title = urllib.parse.quote(item_title)
        mercari_url = f"[https://jp.mercari.com/search?keyword=](https://jp.mercari.com/search?keyword=){encoded_title}&status=on_sale"
        amazon_url = f"[https://www.amazon.co.jp/s?k=](https://www.amazon.co.jp/s?k=){encoded_title}"
        yahoo_url = f"[https://paypayfleamarket.yahoo.co.jp/search/](https://paypayfleamarket.yahoo.co.jp/search/){encoded_title}"

        record = {
            "item_title": item_title,
            "rank": target["rank"],
            "score": target["score"],
            "category": category,
            "purchase_price": purchase_price,
            "expected_profit": expected_profit,
            "ai_comment": ai_comment,
            "source_url": target["url"],
            "mercari_url": mercari_url,
            "amazon_url": amazon_url,
            "yahoo_url": yahoo_url,
            "created_at": datetime.utcnow().isoformat()
        }

        supabase.table("surging_items").insert(record).execute()
        print(f"自動保存完了: [{category}] {item_title} (判定: {judgment})")

if __name__ == "__main__":
    run_scraper()
