import express from 'express';
import {
  getBlockNoByTime,
  getAccountTransaction,
  TransactionResponse,
  TokenTransaction,
} from './api/etherscan.api';
const app = express();
const port = 5678;

app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from TypeScript API!' });
});

app.get('/api/transactions/:walletAddress', async (req, res) => {
  const walletAddress = req.params.walletAddress;
  const blockNo = await getBlockNoByTime();
  console.log(blockNo);
  const response: TransactionResponse = await getAccountTransaction(walletAddress, blockNo);
  const transactions: TokenTransaction[] = response.result;
  console.log('transactions', transactions);
  res.send(transactions);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
