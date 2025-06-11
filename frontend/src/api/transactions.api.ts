import api from '@/utils/api'

export const getTransactions = async (walletAddress: string) => {
  const response = await api.get(`/api/transactions/${walletAddress}`)
  return response.data
}
