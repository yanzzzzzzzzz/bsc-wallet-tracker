import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.ETHERSCAN_API_KEY;
if (!API_KEY) {
  throw new Error('ETHERSCAN_API_KEY is not defined in environment variables');
}

const api = axios.create({
  baseURL: 'https://api.etherscan.io/api',
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
export const getBlockNoByTime = async (): Promise<string> => {
  const now = new Date();
  const timestamp = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000,
  );
  const response = await api.get('', {
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
