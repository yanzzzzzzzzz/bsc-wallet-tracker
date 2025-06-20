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
from typing import Dict, List, Optional, Union
import uvicorn
from getHistoryPrice import get_token_prices_from_moralis
from getPrice import get_crypto_price

load_dotenv()
API_KEY = os.getenv("ETHERSCAN_API_KEY")
ADDRESS = os.getenv("WALLET_ADDRESS")
PORT = os.getenv("PORT")
CHAIN_ID = 56

TARGET_DATE = datetime.now(timezone.utc).strftime("%Y-%m-%d")
target_date = datetime.now(timezone.utc).date()

STABLE_COINS = {
    "BSC-USD",
    "USDC",
    "USDT",
    "BUSD",
    "DAI",
    "FDUSD",
    "TUSD",
    "USDP",
    "USDD",
    "GUSD",
    "FRAX",
    "LUSD",
    "USDJ",
    "USDK",
    "USDN",
    "USDQ",
    "USDX",
    "USDY",
    "USDZ"
}

app = FastAPI(
    title="BSC Wallet Transaction Tracker API",
    description="API for tracking BEP-20 token transactions on BSC",
    version="1.0.0"
)

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

class TokenSummary(BaseModel):
    input: float
    output: float
    volume: float
    profitAndLoss: float

class TransactionSummary(BaseModel):
    tokens: Dict[str, TokenSummary]
    total_volume: float
    total_profitAndLoss: float
    total_gas_fee: float
    total_gas_fee_usd: float

class TransactionResponse(BaseModel):
    transactions: List[dict]
    summary: TransactionSummary

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

def summarize_txs(txs, wallet_address:str, token_prices: Dict):
    token_summary = defaultdict(lambda: {"input": 0.0, "output": 0.0, "volume": 0.0, "profitAndLoss": 0.0})
    total_volume = 0.0
    total_profitAndLoss = 0.0
    total_gas_fee = 0.0
    total_gas_fee_usd = 0.0
    for tx in txs:
        decimals = int(tx["tokenDecimal"])
        value = int(tx["value"]) / (10 ** decimals)
        symbol = tx["tokenSymbol"]
        coin_price = token_prices.get(symbol, 1)
        usd_value = value * coin_price
        total_gas_fee += int(tx['gasUsed']) * int(tx['gasPrice']) / 10**18
        if tx["to"].lower() == wallet_address.lower():
            token_summary[symbol]["input"] += value
            token_summary[symbol]["volume"] += usd_value * 2
            token_summary[symbol]["profitAndLoss"] += usd_value
        else:
            token_summary[symbol]["output"] += value
            token_summary[symbol]["profitAndLoss"] -= usd_value
            if symbol in STABLE_COINS:
                total_volume += usd_value * 2
    
    total_profitAndLoss = sum(data["profitAndLoss"] for data in token_summary.values())
    total_gas_fee_usd = total_gas_fee * token_prices.get('BNB', 600)
    return TransactionSummary(
        tokens=token_summary,
        total_volume=total_volume,
        total_profitAndLoss=total_profitAndLoss,
        total_gas_fee=total_gas_fee,
        total_gas_fee_usd=total_gas_fee_usd
    )

def transform_transactions(txs: List[dict], wallet_address: str) -> List[dict]:
    grouped: Dict[str, List[dict]] = defaultdict(list)
    for tx in txs:
        grouped[tx["hash"]].append(tx)

    result: List[dict] = []
    wallet_lower = wallet_address.lower()

    for tx_hash, events in grouped.items():
        events.sort(key=lambda x: int(x["timeStamp"]))
        first = events[0]
        ts = int(first.get("timeStamp", 0))
        gas_used = int(first.get("gasUsed", 0))
        gas_price = int(first.get("gasPrice", 0))
        gas = gas_used * gas_price / 10**18

        from_tokens = [
            e for e in events
            if e.get("from", "").lower() == wallet_lower and int(e.get("value", 0)) > 1e9
        ]

        to_tokens = [
            e for e in events
            if e.get("to", "").lower() == wallet_lower and int(e.get("value", 0)) > 1e9
        ]

        if not from_tokens or not to_tokens:
            continue 

        from_event = max(from_tokens, key=lambda e: int(e["value"]))
        to_event = max(to_tokens, key=lambda e: int(e["value"]))

        amount = int(from_event["value"]) / (10 ** int(from_event["tokenDecimal"]))
        return_amount = int(to_event["value"]) / (10 ** int(to_event["tokenDecimal"]))

        result.append({
            "hash": tx_hash,
            "timestamp": ts,
            "gas": gas,
            "status": "success",
            "from": {
                "address": from_event["contractAddress"],
                "symbol": 'USDT' if from_event["tokenSymbol"] == 'BSC-USD' else from_event["tokenSymbol"],
                "amount": amount,
                "decimals": int(from_event["tokenDecimal"]),
            },
            "to": {
                "address": to_event["contractAddress"],
                "symbol": 'USDT' if to_event["tokenSymbol"] == 'BSC-USD' else from_event["tokenSymbol"],
                "amount": return_amount,
                "decimals": int(to_event["tokenDecimal"]),
            },
        })

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
def extract_unique_token_info(transactions: List[Dict]) -> List[Dict[str, str]]:
    seen_symbols = set()
    result = []
    
    for tx in transactions:
        symbol = tx.get("tokenSymbol")
        if symbol and symbol not in seen_symbols:
            seen_symbols.add(symbol)
            result.append({
                "token_address": tx.get("contractAddress"),
                "to_block": tx.get("blockNumber")
            })
    
    return result
def extract_unique_token_symbol(transactions: List[Dict]) -> List[Dict[str, str]]:
    seen_symbols = set()
    result = []
    
    for tx in transactions:
        symbol = tx.get("tokenSymbol")
        if symbol and symbol not in seen_symbols:
            seen_symbols.add(symbol)
            result.append(symbol)
    
    return result
def get_usd_price_by_contract_address(data: List[Dict], symbol: str) -> Optional[float]:
    for token in data:
        if token.get("tokenAddress") == symbol:
            return token.get("usdPrice")
    return 1
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
        # output = extract_unique_token_info(txs)
        output = extract_unique_token_symbol(txs)
        if 'BNB' not in output:
            output.append('BNB')

        token_prices = get_crypto_price(output)
        #token_prices = get_token_pices_from_fake(output)
        summary = summarize_txs(txs, wallet_address, token_prices)
        formatted_txs = transform_transactions(txs, wallet_address)
        
        return TransactionResponse(
            transactions=formatted_txs,
            summary=summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=int(PORT) if PORT else 8100)
