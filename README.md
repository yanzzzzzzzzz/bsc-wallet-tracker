# 🔍 Binance Wallet Transaction Tracker

A simple Python tool to track token transactions on BSC (Binance Smart Chain) for a specific wallet address.

## Features

- Track BEP-20 Token transactions on BSC
- Query transactions by UTC date
- Summarize transaction counts and amounts by token

## Setup

```bash
# Clone repository
git clone https://github.com/your-repo/bsc-wallet-tracker.git
cd bsc-wallet-tracker

# Create virtual environment
python -m venv env
env\Scripts\activate    # Windows
source env/bin/activate # Linux/Mac

# Install dependencies
pip install -r requirements.txt
```

## Usage

```bash
# Run the program
python main.py
```

## Configuration

Create a `.env` file with:

```
ETHERSCAN_API_KEY=your_api_key
WALLET_ADDRESS=your_wallet_address
```
