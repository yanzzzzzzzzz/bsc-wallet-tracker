import express from 'express';
import {
  getBlockNoByTime,
  getAccountTransaction,
  TokenTransaction,
  summarizeTransactions,
  transformTransactions,
  mockGetCryptoPrice,
} from './api/etherscan.api';
const app = express();
const port = 5678;

app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from TypeScript API!' });
});

app.get('/api/transactions/:walletAddress', async (req, res) => {
  const walletAddress = req.params.walletAddress;
  const dateStr = req.query.date as string | undefined;
  const targetDate = dateStr || new Date().toISOString().slice(0, 10);
  try {
    const blockNo = await getBlockNoByTime();

    const transactions: TokenTransaction[] = await getAccountTransaction(
      walletAddress,
      blockNo,
      targetDate,
    );
    const symbols = Array.from(new Set(transactions.map((tx) => tx.tokenSymbol)));
    if (!symbols.includes('BNB')) symbols.push('BNB');
    const tokenPrices = await mockGetCryptoPrice(symbols);
    const summary = summarizeTransactions(transactions, walletAddress, tokenPrices);
    const formattedTxs = transformTransactions(transactions, walletAddress);
    res.json({
      transactions: formattedTxs,
      summary,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
