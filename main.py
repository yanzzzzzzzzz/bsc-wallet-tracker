import os
import requests
from dotenv import load_dotenv
from collections import defaultdict
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.requests import Request
from pydantic import BaseModel
from typing import Dict, List, Optional
import uvicorn

load_dotenv()
API_KEY = os.getenv("ETHERSCAN_API_KEY")
ADDRESS = os.getenv("WALLET_ADDRESS")
PORT = os.getenv("PORT")
CHAIN_ID = 56

TARGET_DATE = datetime.now(timezone.utc).strftime("%Y-%m-%d")
target_date = datetime.now(timezone.utc).date()

app = FastAPI(
    title="BSC Wallet Transaction Tracker API",
    description="API for tracking BEP-20 token transactions on BSC",
    version="1.0.0"
)

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

class TransactionResponse(BaseModel):
    transactions: List[dict]
    summary: Dict[str, dict]

def fetch_token_transfers(chain_id, address, target_date, start_block):
    all_txs = []
    page = 1
    found_date = False

    while True:
        url = "https://api.etherscan.io/v2/api"
        params = {
            "module": "account",
            "action": "tokentx",
            "chainid": chain_id,
            "address": address,
            "startblock": start_block,
            "endblock": 99999999,
            "page": page,
            "offset": 100,
            "sort": "desc",
            "apikey": API_KEY
        }

        response = requests.get(url, params=params)
        data = response.json()

        if data.get("status") != "1":
            raise HTTPException(status_code=400, detail=f"API 錯誤：{data.get('message')}")

        txs = data["result"]
        if not txs:
            break

        for tx in txs:
            ts = int(tx["timeStamp"])
            tx_time = datetime.fromtimestamp(ts, timezone.utc)
            tx_date = tx_time.date()

            if tx_date == target_date:
                all_txs.append(tx)
                found_date = True
            elif tx_date < target_date:
                return all_txs

        if not found_date:
            page += 1
        else:
            page += 1

    return all_txs

def summarize_txs(txs):
    summary = defaultdict(lambda: {"count": 0, "total": 0.0})
    for tx in txs:
        symbol = tx["tokenSymbol"]
        decimals = int(tx["tokenDecimal"])
        value = int(tx["value"]) / (10 ** decimals)

        summary[symbol]["count"] += 1
        summary[symbol]["total"] += value
    return summary

def merge_transactions_by_hash(txs, wallet_address):
    """Merge transfers that share the same hash.

    The resulting entry will include the token names and amounts sent
    from the wallet (``from``) and received by the wallet (``to``).
    """

    merged = {}
    wallet_lower = wallet_address.lower()
    for tx in txs:
        h = tx["hash"]
        decimals = int(tx["tokenDecimal"])
        value = int(tx["value"]) / (10 ** decimals)

        m = merged.setdefault(
            h,
            {
                "hash": h,
                "timeStamp": tx["timeStamp"],
                "gasPrice": tx.get("gasPrice"),
                "gasUsed": tx.get("gasUsed"),
                "from_token": "",
                "to_token": "",
                "from_amount": 0.0,
                "to_amount": 0.0,
            },
        )

        if tx["from"].lower() == wallet_lower:
            m["from_token"] = tx["tokenSymbol"]
            m["from_amount"] += value
        if tx["to"].lower() == wallet_lower:
            m["to_token"] = tx["tokenSymbol"]
            m["to_amount"] += value

    result = []
    for m in merged.values():
        result.append(
            {
                "hash": m["hash"],
                "timeStamp": m["timeStamp"],
                "from": m["from_token"],
                "to": m["to_token"],
                "from_amount": m["from_amount"],
                "to_amount": m["to_amount"],
                "gasPrice": m["gasPrice"],
                "gasUsed": m["gasUsed"],
            }
        )

    result.sort(key=lambda x: int(x["timeStamp"]), reverse=True)
    return result

def print_summary(summary, date_str):
    print(f"\n📅 {date_str} 的 Token 交易紀錄（UTC）：")
    if not summary:
        print("❌ 當日無交易")
        return

    for symbol, data in summary.items():
        print(f"🔹 {symbol}: {data['count']} 筆，共 {data['total']:.4f} {symbol}")

def get_block_number_by_date(date_str):
    dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    timestamp = int(dt.timestamp())

    url = "https://api.etherscan.io/api"
    params = {
        "module": "block",
        "action": "getblocknobytime",
        "timestamp": timestamp,
        "closest": "before",
        "apikey": API_KEY
    }

    response = requests.get(url, params=params)
    data = response.json()

    if data.get("status") != "1":
        raise HTTPException(status_code=400, detail=f"無法取得起始區塊：{data.get('message')}")
    
    print(f"🔢 起始區塊（UTC {date_str}）: {data['result']}")
    return int(data["result"])

def print_transaction_details(txs):
    print("\n🧾 當日交易明細：")
    if not txs:
        print("❌ 無交易資料")
        return

    for tx in txs:
        symbol = tx["tokenSymbol"]
        decimals = int(tx["tokenDecimal"])
        value = int(tx["value"]) / (10 ** decimals)

        from_addr = tx["from"]
        to_addr = tx["to"]

        direction = "🔻 Sent" if from_addr.lower() == ADDRESS.lower() else "🔺 Received"
        counterparty = to_addr if direction == "🔻 Sent" else from_addr

        print(f"{direction} {value:.4f} {symbol} to/from {counterparty}")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request, wallet_address: str = None):
    """
    返回主頁，可選帶入錢包地址
    """
    return templates.TemplateResponse("index.html", {
        "request": request,
        "wallet_address": wallet_address
    })

@app.get("/transactions/{wallet_address}", response_model=TransactionResponse)
async def get_transactions(wallet_address: str):
    try:
        target_date = datetime.now(timezone.utc).date()
        date_str = target_date.strftime("%Y-%m-%d")
        
        start_block = get_block_number_by_date(date_str)
        txs = fetch_token_transfers(CHAIN_ID, wallet_address, target_date, start_block)
        summary = summarize_txs(txs)
        merged = merge_transactions_by_hash(txs, wallet_address)

        return TransactionResponse(
            transactions=merged,
            summary=summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=int(PORT) if PORT else 8100)
