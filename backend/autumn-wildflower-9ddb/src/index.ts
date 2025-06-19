export interface Env {
	ETHERSCAN_API_KEY: string;
}
interface TokenTransaction {
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

interface TokenSummary {
	input: number;
	output: number;
	volume: number;
	profitAndLoss: number;
}

interface TransactionSummary {
	tokens: Record<string, TokenSummary>;
	total_volume: number;
	total_profitAndLoss: number;
	total_gas_fee: number;
	total_gas_fee_usd: number;
}

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

async function getBlockNoByTime(apiKey: string): Promise<string> {
	const now = new Date();
	const timestamp = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000);
	const url = `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${apiKey}`;
	const response = await fetch(url);
	const data: any = await response.json();
	if (data.status === '0') throw new Error(`API Error: ${data.message}`);
	return data.result;
}

async function getAccountTransaction(address: string, startblock: string, apiKey: string, targetDate?: string) {
	let page = 1;
	let allTxs: any[] = [];
	let hasMore = true;
	const filterDate = targetDate ? new Date(targetDate) : null;
	while (hasMore) {
		const params = new URLSearchParams({
			module: 'account',
			action: 'tokentx',
			chainid: '56',
			address,
			startblock,
			endblock: '99999999',
			page: page.toString(),
			offset: '100',
			sort: 'desc',
			apikey: apiKey,
		});
		const url = `https://api.etherscan.io/v2/api?${params.toString()}`;
		const response = await fetch(url);
		const data: any = await response.json();
		if (data.status === '0') {
			if (data.result === 'No transactions found') break;
			throw new Error(`API Error: ${data.message}`);
		}
		let txs = data.result;
		if (!txs || txs.length === 0) break;
		if (filterDate) {
			txs = txs.filter((tx: any) => {
				const txDate = new Date(parseInt(tx.timeStamp) * 1000);
				return (
					txDate.getUTCFullYear() === filterDate.getUTCFullYear() &&
					txDate.getUTCMonth() === filterDate.getUTCMonth() &&
					txDate.getUTCDate() === filterDate.getUTCDate()
				);
			});
			if (txs.length < data.result.length) hasMore = false;
		}
		allTxs = allTxs.concat(txs);
		if (txs.length < 100) hasMore = false;
		else page += 1;
	}
	return allTxs;
}

async function mockGetCryptoPrice(symbols: string[]): Promise<Record<string, number>> {
	const price: Record<string, number> = {};
	symbols.forEach((sym) => {
		if (sym === 'BNB') price[sym] = 600;
		else if (sym === 'USDT' || sym === 'BSC-USD') price[sym] = 1;
		else price[sym] = 10;
	});
	return price;
}

function summarizeTransactions(txs: TokenTransaction[], walletAddress: string, tokenPrices: Record<string, number>): TransactionSummary {
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
	total_profitAndLoss = Object.values(tokenSummary).reduce((acc, cur) => acc + cur.profitAndLoss, 0);
	total_gas_fee_usd = total_gas_fee * (tokenPrices['BNB'] ?? 600);
	return {
		tokens: tokenSummary,
		total_volume,
		total_profitAndLoss,
		total_gas_fee,
		total_gas_fee_usd,
	};
}

function transformTransactions(txs: TokenTransaction[], walletAddress: string): any[] {
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
		const fromTokens = events.filter((e) => e.from.toLowerCase() === walletLower && parseFloat(e.value) > 1e9);
		const toTokens = events.filter((e) => e.to.toLowerCase() === walletLower && parseFloat(e.value) > 1e9);
		if (!fromTokens.length || !toTokens.length) return;
		const fromEvent = fromTokens.reduce((a, b) => (parseFloat(a.value) > parseFloat(b.value) ? a : b));
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
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		if (url.pathname.startsWith('/api/transactions/')) {
			const walletAddress = url.pathname.split('/').pop()!;
			const dateStr = url.searchParams.get('date') || undefined;
			try {
				const apiKey = env.ETHERSCAN_API_KEY;

				const blockNo = await getBlockNoByTime(apiKey);
				const transactions: TokenTransaction[] = await getAccountTransaction(walletAddress, blockNo, apiKey, dateStr);
				const symbols = Array.from(new Set(transactions.map((tx) => tx.tokenSymbol)));
				if (!symbols.includes('BNB')) symbols.push('BNB');
				const tokenPrices = await mockGetCryptoPrice(symbols);
				const summary = summarizeTransactions(transactions, walletAddress, tokenPrices);
				const formattedTxs = transformTransactions(transactions, walletAddress);
				return new Response(JSON.stringify({ transactions: formattedTxs, summary }), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (err: any) {
				return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
					status: 500,
				});
			}
		}
		return new Response('Not found', { status: 404 });
	},
};
