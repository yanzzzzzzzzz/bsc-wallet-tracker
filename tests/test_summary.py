import sys
import os
import types
import pytest

# Ensure the project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Stub external dependencies used in main.py so it can be imported without them
sys.modules.setdefault('requests', types.ModuleType('requests'))

dotenv_module = types.ModuleType('dotenv')
dotenv_module.load_dotenv = lambda: None
sys.modules.setdefault('dotenv', dotenv_module)

# Minimal fastapi stubs
fastapi_module = types.ModuleType('fastapi')
class HTTPException(Exception):
    def __init__(self, status_code=None, detail=None):
        self.status_code = status_code
        self.detail = detail
class FastAPI:
    def __init__(self, *args, **kwargs):
        pass
    def mount(self, *args, **kwargs):
        pass
    def get(self, *args, **kwargs):
        def decorator(func):
            return func
        return decorator
fastapi_module.FastAPI = FastAPI
fastapi_module.HTTPException = HTTPException
sys.modules.setdefault('fastapi', fastapi_module)

staticfiles_module = types.ModuleType('fastapi.staticfiles')
class StaticFiles:
    def __init__(self, *args, **kwargs):
        pass
staticfiles_module.StaticFiles = StaticFiles
sys.modules.setdefault('fastapi.staticfiles', staticfiles_module)

templating_module = types.ModuleType('fastapi.templating')
class Jinja2Templates:
    def __init__(self, *args, **kwargs):
        pass
    def TemplateResponse(self, *args, **kwargs):
        pass
templating_module.Jinja2Templates = Jinja2Templates
sys.modules.setdefault('fastapi.templating', templating_module)

responses_module = types.ModuleType('fastapi.responses')
class HTMLResponse:
    pass
responses_module.HTMLResponse = HTMLResponse
sys.modules.setdefault('fastapi.responses', responses_module)

requests_module = types.ModuleType('fastapi.requests')
class Request:
    pass
requests_module.Request = Request
sys.modules.setdefault('fastapi.requests', requests_module)

pydantic_module = types.ModuleType('pydantic')
class BaseModel:
    pass
pydantic_module.BaseModel = BaseModel
sys.modules.setdefault('pydantic', pydantic_module)

sys.modules.setdefault('uvicorn', types.ModuleType('uvicorn'))

from main import summarize_txs, transform_transactions


def test_summarize_txs_empty():
    summary = summarize_txs([])
    assert dict(summary) == {}


def test_summarize_txs_sample():
    txs = [
        {
            "tokenSymbol": "AAA",
            "tokenDecimal": "18",
            "value": "1000000000000000000",
        },
        {
            "tokenSymbol": "AAA",
            "tokenDecimal": "18",
            "value": "2000000000000000000",
        },
        {
            "tokenSymbol": "BBB",
            "tokenDecimal": "6",
            "value": "1500000",
        },
    ]

    summary = summarize_txs(txs)
    expected = {
        "AAA": {"count": 2, "total": 3.0},
        "BBB": {"count": 1, "total": 1.5},
    }
    assert dict(summary) == expected


def test_transform_transactions_basic():
    wallet = "0xWallet"
    txs = [
        {
            "hash": "0xabc",
            "timeStamp": "1",
            "gasUsed": "21000",
            "gasPrice": "10000000000",
            "from": wallet,
            "to": "0xrouter",
            "contractAddress": "0xtokenA",
            "tokenSymbol": "AAA",
            "tokenDecimal": "18",
            "value": "1000000000000000000",
        },
        {
            "hash": "0xabc",
            "timeStamp": "1",
            "gasUsed": "21000",
            "gasPrice": "10000000000",
            "from": "0xrouter",
            "to": wallet,
            "contractAddress": "0xtokenB",
            "tokenSymbol": "BBB",
            "tokenDecimal": "6",
            "value": "1500000",
        },
    ]

    formatted = transform_transactions(txs, wallet)
    assert len(formatted) == 1
    tx = formatted[0]
    assert tx["hash"] == "0xabc"
    assert tx["timestamp"] == 1
    assert tx["status"] == "success"
    assert tx["from"]["symbol"] == "AAA"
    assert tx["to"]["symbol"] == "BBB"
    assert tx["amount"] == pytest.approx(1.0)
    assert tx["gas"] == pytest.approx(0.00021)
