import requests
from dotenv import load_dotenv
import os
from typing import List, Dict

def get_token_prices_from_moralis(tokens: List[Dict[str, str]]) -> Dict:
    load_dotenv()
    api_key = os.getenv("MORALIS_API_KEY")
    
    if not api_key:
        raise ValueError("MORALIS_API_KEY not found")

    url = "https://deep-index.moralis.io/api/v2/erc20/prices"
    
    headers = {
        "accept": "application/json",
        "X-API-Key": api_key
    }
    
    params = {
        "chain": "bsc",
        "include": "percent_change"
    }

    body = {
        "tokens": tokens
    }

    response = requests.post(url, headers=headers, params=params, json=body)
    response.raise_for_status()
    
    return response.json()