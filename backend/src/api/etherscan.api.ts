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
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});
const v2Api = axios.create({
  baseURL: 'https://api.etherscan.io/v2/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});
interface responseModel {
  status: string;
  message: string;
  result: string;
}

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

export const getAccountTransaction = async (address: string, startblock: string) => {
  let page = 1;
  let allTxs: any[] = [];
  const params = {
    module: 'account',
    action: 'tokentx',
    chainid: BSC_CHAIN_ID,
    address: address,
    startblock: startblock,
    endblock: 99999999,
    page: page,
    offset: 1000,
    sort: 'desc',
    apikey: API_KEY,
  };

  const response = await v2Api.get('', {
    params: params,
  });
  const data = response.data;

  if (data.status === '0') {
    throw new Error(`API Error: ${data.message}`);
  }
  return data;
};
