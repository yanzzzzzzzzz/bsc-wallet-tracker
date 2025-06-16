import express from 'express';

const app = express();
const port = 5678;

app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from TypeScript API!' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
