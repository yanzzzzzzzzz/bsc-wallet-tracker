export interface AddressInfo {
  address: string
  symbol: string
  decimals: number
}

export interface Transaction {
  hash: string
  timestamp: number
  gas: number
  status: string
  amount: number
  from: AddressInfo
  to: AddressInfo
  amountUSD: number | null
}

export interface TokenSummary {
  count: number
  total: number
}

export interface TransactionResponse {
  transactions: Transaction[]
  summary: Record<string, TokenSummary>
}
