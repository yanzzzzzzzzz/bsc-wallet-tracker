import requests

def get_crypto_price(tokens):
    url = f"https://min-api.cryptocompare.com/data/pricemulti?fsyms={','.join(tokens)}&tsyms=USD"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return {token: price_data['USD'] for token, price_data in data.items()}
    except requests.exceptions.RequestException as e:
        print(f"get price error: {e}")
        return None