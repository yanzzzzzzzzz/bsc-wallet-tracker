export interface AddressInfo {
  address: string
  decimals: number
  symbol: string
}

export interface Transaction {
  amount: number
  from: AddressInfo
  gas: number
  hash: string
  status: string
  timestamp: number
  to: AddressInfo
}

export interface TokenSummary {
  input: number
  output: number
  profitAndLoss: number
  volume: number
}
export interface Summary {
  tokens: Record<string, TokenSummary>
  total_volume: number
  total_profitAndLoss: number
}
export interface TransactionResponse {
  transactions: Transaction[]
  summary: Summary
}
