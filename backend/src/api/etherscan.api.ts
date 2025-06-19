import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.ETHERSCAN_API_KEY;
if (!API_KEY) {
  throw new Error('ETHERSCAN_API_KEY is not defined in environment variables');
}
const BSC_CHAIN_ID = 56;
const v1Api = axios.create({
  baseURL: 'https://api.etherscan.io/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
const v2Api = axios.create({
  baseURL: 'https://api.etherscan.io/v2/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
export interface TokenTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  methodId: string;
  functionName: string;
  confirmations: string;
}

export interface TransactionResponse {
  status: string;
  message: string;
  result: TokenTransaction[];
}

export const getBlockNoByTime = async (): Promise<string> => {
  const now = new Date();
  const timestamp = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000,
  );
  const response = await v1Api.get('', {
    params: {
      module: 'block',
      action: 'getblocknobytime',
      timestamp: timestamp,
      closest: 'before',
      apikey: API_KEY,
    },
  });
  const data = response.data;
  if (data.status === '0') {
    throw new Error(`API Error: ${data.message}`);
  }
  return data.result;
};

export const getAccountTransaction = async (
  address: string,
  startblock: string,
  targetDate?: string,
) => {
  let page = 1;
  let allTxs: any[] = [];
  let hasMore = true;
  const filterDate = targetDate ? new Date(targetDate) : null;
  while (hasMore) {
    const params = {
      module: 'account',
      action: 'tokentx',
      chainid: BSC_CHAIN_ID,
      address: address,
      startblock: startblock,
      endblock: 99999999,
      page: page,
      offset: 100,
      sort: 'desc',
      apikey: API_KEY,
    };
    const response = await v2Api.get('', { params });
    const data = response.data;
    if (data.status === '0') {
      if (data.result === 'No transactions found') {
        break;
      }
      throw new Error(`API Error: ${data.message}`);
    }
    let txs = data.result;
    if (!txs || txs.length === 0) {
      break;
    }
    if (filterDate) {
      txs = txs.filter((tx: any) => {
        const txDate = new Date(parseInt(tx.timeStamp) * 1000);
        return (
          txDate.getUTCFullYear() === filterDate.getUTCFullYear() &&
          txDate.getUTCMonth() === filterDate.getUTCMonth() &&
          txDate.getUTCDate() === filterDate.getUTCDate()
        );
      });
      if (txs.length < data.result.length) {
        hasMore = false;
      }
    }
    allTxs = allTxs.concat(txs);
    if (txs.length < 100) {
      hasMore = false;
    } else {
      page += 1;
    }
  }
  return allTxs;
};

export interface TokenSummary {
  input: number;
  output: number;
  volume: number;
  profitAndLoss: number;
}

export interface TransactionSummary {
  tokens: Record<string, TokenSummary>;
  total_volume: number;
  total_profitAndLoss: number;
  total_gas_fee: number;
  total_gas_fee_usd: number;
}

export interface TransactionResponse {
  transactions: any[]; // 你可以根據 transform_transactions 的格式細化
  summary: TransactionSummary;
}

// 穩定幣列表
const STABLE_COINS = [
  'BSC-USD',
  'USDC',
  'USDT',
  'BUSD',
  'DAI',
  'FDUSD',
  'TUSD',
  'USDP',
  'USDD',
  'GUSD',
  'FRAX',
  'LUSD',
  'USDJ',
  'USDK',
  'USDN',
  'USDQ',
  'USDX',
  'USDY',
  'USDZ',
];

// mock 取得 token 價格
export const mockGetCryptoPrice = async (symbols: string[]): Promise<Record<string, number>> => {
  // 這裡直接給定假價格，實際可串接真 API
  const price: Record<string, number> = {};
  symbols.forEach((sym) => {
    if (sym === 'BNB') price[sym] = 600;
    else if (sym === 'USDT' || sym === 'BSC-USD') price[sym] = 1;
    else price[sym] = 10; // 其他 token 給 10 USD
  });
  return price;
};

// 交易彙總
export const summarizeTransactions = (
  txs: TokenTransaction[],
  walletAddress: string,
  tokenPrices: Record<string, number>,
): TransactionSummary => {
  const tokenSummary: Record<string, TokenSummary> = {};
  let total_volume = 0;
  let total_profitAndLoss = 0;
  let total_gas_fee = 0;
  let total_gas_fee_usd = 0;
  txs.forEach((tx) => {
    const decimals = parseInt(tx.tokenDecimal);
    const value = parseFloat(tx.value) / Math.pow(10, decimals);
    const symbol = tx.tokenSymbol;
    const coin_price = tokenPrices[symbol] ?? 1;
    const usd_value = value * coin_price;
    total_gas_fee += (parseFloat(tx.gasUsed) * parseFloat(tx.gasPrice)) / 1e18;
    if (!tokenSummary[symbol]) {
      tokenSummary[symbol] = { input: 0, output: 0, volume: 0, profitAndLoss: 0 };
    }
    if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
      tokenSummary[symbol].input += value;
      tokenSummary[symbol].volume += usd_value * 2;
      tokenSummary[symbol].profitAndLoss += usd_value;
    } else {
      tokenSummary[symbol].output += value;
      tokenSummary[symbol].profitAndLoss -= usd_value;
      if (STABLE_COINS.includes(symbol)) {
        total_volume += usd_value * 2;
      }
    }
  });
  total_profitAndLoss = Object.values(tokenSummary).reduce(
    (acc, cur) => acc + cur.profitAndLoss,
    0,
  );
  total_gas_fee_usd = total_gas_fee * (tokenPrices['BNB'] ?? 600);
  return {
    tokens: tokenSummary,
    total_volume,
    total_profitAndLoss,
    total_gas_fee,
    total_gas_fee_usd,
  };
};

// 交易格式化
export const transformTransactions = (txs: TokenTransaction[], walletAddress: string): any[] => {
  const grouped: Record<string, TokenTransaction[]> = {};
  txs.forEach((tx) => {
    if (!grouped[tx.hash]) grouped[tx.hash] = [];
    grouped[tx.hash].push(tx);
  });
  const result: any[] = [];
  const walletLower = walletAddress.toLowerCase();
  Object.entries(grouped).forEach(([txHash, events]) => {
    events.sort((a, b) => parseInt(a.timeStamp) - parseInt(b.timeStamp));
    const first = events[0];
    const ts = parseInt(first.timeStamp);
    const gas_used = parseFloat(first.gasUsed);
    const gas_price = parseFloat(first.gasPrice);
    const gas = (gas_used * gas_price) / 1e18;
    const fromTokens = events.filter(
      (e) => e.from.toLowerCase() === walletLower && parseFloat(e.value) > 1e9,
    );
    const toTokens = events.filter(
      (e) => e.to.toLowerCase() === walletLower && parseFloat(e.value) > 1e9,
    );
    if (!fromTokens.length || !toTokens.length) return;
    const fromEvent = fromTokens.reduce((a, b) =>
      parseFloat(a.value) > parseFloat(b.value) ? a : b,
    );
    const toEvent = toTokens.reduce((a, b) => (parseFloat(a.value) > parseFloat(b.value) ? a : b));
    const amount = parseFloat(fromEvent.value) / Math.pow(10, parseInt(fromEvent.tokenDecimal));
    const return_amount = parseFloat(toEvent.value) / Math.pow(10, parseInt(toEvent.tokenDecimal));
    result.push({
      hash: txHash,
      timestamp: ts,
      gas,
      status: 'success',
      from: {
        address: fromEvent.contractAddress,
        symbol: fromEvent.tokenSymbol === 'BSC-USD' ? 'USDT' : fromEvent.tokenSymbol,
        amount,
        decimals: parseInt(fromEvent.tokenDecimal),
      },
      to: {
        address: toEvent.contractAddress,
        symbol: toEvent.tokenSymbol === 'BSC-USD' ? 'USDT' : toEvent.tokenSymbol,
        amount: return_amount,
        decimals: parseInt(toEvent.tokenDecimal),
      },
    });
  });
  return result;
};
