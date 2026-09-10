import os
from supabase import create_client, Client

# GitHub Secretsから認証情報を取得
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def run_scraper():
    # 自動収集用データ（テスト送信）
    item_data = {
        "item_title": "【クラウド自動収集】限定フィギュア",
        "purchase_price": 4500,
        "estimated_profit": 8000,
        "score": 92,
        "rank": "S",
        "memo": "GitHub Actionsから自動定期実行されたデータです",
        "url": "https://example.com"
    }

    # Supabaseのテーブルへ挿入
    response = supabase.table("surging_items").insert(item_data).execute()
    print("データ送信成功:", response)

if __name__ == "__main__":
    run_scraper()
