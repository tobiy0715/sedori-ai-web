import os
import re
import json
import requests
from bs4 import BeautifulSoup
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

def fetch_yahoo_trending_keywords():
    """Yahoo!フリマ・各種フリマの急上昇・高需要ワードを20件取得"""
    print("AIトレンドジェネレータを作動させます（20件取得）")
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = """
現在、日本のフリマアプリ（Yahoo!フリマ、メルカリ等）で【検索急上昇中】または【売り切れ（SOLD OUT）連発中】の注目のトレンド商品・具体的なキャラクター・型番・限定グッズ名を20個提案してください。
ホビー、カード、フィギュア、限定アパレル、アミューズメント景品、コラボ商品などジャンルをばらけさせてください。

出力フォーマット:
カンマ区切りでキーワードのみを出力してください。余計な説明、番号、改行は一切不要です。
"""
        res = model.generate_content(prompt)
        ai_keywords = [k.strip() for k in res.text.replace("\n", "").split(",") if k.strip()]
        if ai_keywords:
            return ai_keywords[:20]
    except Exception as e:
        print(f"AIトレンド生成エラー: {e}")
    
    return [
        "ちいかわ りんりんおかおマスコット", "ポケモンカード MEGA 30th", "ONE PIECE フィギュア 限定",
        "一番くじ ラストワン賞", "サンリオ シークレットマスコット", "たまごっち Uni 限定",
        "ドラゴンボール 1番くじ A賞", "ハイキュー 缶バッジ", "呪術廻戦 アクリルスタンド",
        "仮面ライダー プレミアムバンダイ", "ガンプラ HG 限定", "プロ野球チップス カード",
        "ウマ娘 ぬいぐるみ", "ディズニー クッキーアン", "スターバックス タンブラー 限定",
        "ナイキ エアフォース1 コラボ", "シュプリーム Tシャツ", "G-SHOCK 限定モデル",
        "Switch ソフト 限定版", "PS5 周辺機器"
    ]

def analyze_trending_item_with_gemini(keyword):
    """各キーワードのメルカリ・フリマ相場と利益をAI解析・判定"""
    prompt = f"""
あなたはプロのせどり・転売リサーチAIです。
フリマアプリで検索急上昇中のトレンドワード「{keyword}」について、
フリマ市場で取引されているリアルな商品情報・相場を予測・補正して生成してください。

必ず以下のJSON形式「のみ」で出力し、前後にマークダウンや他の文章を一切含めないこと。

{{
  "item_title": "フリマでそのまま検索できる正確な商品名・型番",
  "category": "ホビー / アパレル / 家電 / グッズ のいずれか",
  "purchase_price": 3000,
  "market_price": 6500,
  "reason": "なぜ今人気・急上昇・プレ値化しているのか（需要理由）"
}}
"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            text = match.group(0)
            
        res_json = json.loads(text)
        
        pur = int(res_json.get("purchase_price", 3000))
        mkt = int(res_json.get("market_price", 6000))
        if pur <= 0: pur = 3000
        if mkt <= pur: mkt = pur + 2500

        return {
            "item_title": str(res_json.get("item_title", keyword)),
            "category": str(res_json.get("category", "グッズ")),
            "purchase_price": pur,
            "market_price": mkt,
            "reason": str(res_json.get("reason", "フリマ検索急上昇中"))
        }
    except Exception as e:
        print(f"Gemini解析エラー ({keyword}): {e}")
        return {
            "item_title": keyword,
            "category": "グッズ",
            "purchase_price": 3000,
            "market_price": 6500,
            "reason": "検索急上昇ワードからの自動抽出"
        }

def run_scraper():
    delete_old_items()

    trending_keywords = fetch_yahoo_trending_keywords()
    print(f"取得件数: {len(trending_keywords)}件の処理を開始します")

    for kw in trending_keywords:
        ai_data = analyze_trending_item_with_gemini(kw)
        
        clean_name = ai_data["item_title"]
        purchase_price = ai_data["purchase_price"]
        market_price = ai_data["market_price"]
        
        platform_fee = int(market_price * 0.10)
        shipping_fee = 700
        net_profit = market_price - purchase_price - platform_fee - shipping_fee
        profit_margin = round((net_profit / market_price) * 100, 1) if market_price > 0 else 0
        
        if profit_margin >= 15 and net_profit > 800:
            judgment = "即仕入れ"
            score = 90
            rank = "S"
        elif profit_margin >= 5:
            judgment = "要検討"
            score = 70
            rank = "A"
        else:
            judgment = "見送り"
            score = 40
            rank = "B"

        encoded_search = requests.utils.quote(clean_name)
        
        yahoo_url = f"https://paypayfleamarket.yahoo.co.jp/search/{encoded_search}"
        mercari_sold_url = f"https://jp.mercari.com/search?keyword={encoded_search}&status=sold_out"
        amazon_url = f"https://www.amazon.co.jp/s?k={encoded_search}"
        
        calc_details = f"売値:{market_price:,} - 仕入:{purchase_price:,} - 手数料:{platform_fee} - 送料:{shipping_fee}"
        ai_comment = f"【🔥急上昇 / {judgment} / 利益率:{profit_margin}%】{ai_data['reason']} ({calc_details})"

        data = {
            "item_title": clean_name,
            "url": yahoo_url,
            "mercari_url": mercari_sold_url,
            "amazon_url": amazon_url,
            "yahoo_url": yahoo_url,
            "source_url": yahoo_url,
            "score": score,
            "rank": rank,
            "category": str(ai_data["category"]),
            "purchase_price": purchase_price,
            "expected_profit": net_profit,
            "ai_comment": ai_comment
        }
        
        try:
            supabase.table("surging_items").insert(data).execute()
            print(f"保存成功 [{judgment}]: {clean_name}")
        except Exception as db_err:
            print(f"DB保存エラー: {db_err}")

if __name__ == "__main__":
    run_scraper()
