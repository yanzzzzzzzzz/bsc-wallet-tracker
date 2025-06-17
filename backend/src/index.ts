import express from 'express';
import { getBlockNoByTime } from './api/etherscan.api';
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
  res.send(blockNo);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
