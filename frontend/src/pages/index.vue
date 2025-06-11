<template>
  <v-container class="container">
    <h1 class="text-center my-4">BSC 錢包交易查詢</h1>
    <div class="d-flex justify-center">
      <v-text-field label="錢包地址" variant="solo-filled" v-model="walletAddress" />
      <v-btn @click="handleSearch">查詢</v-btn>
    </div>
    <v-alert type="error" v-if="error" class="mb-4">{{ error }}</v-alert>
    <div v-if="loading" class="text-center my-4">
      <v-progress-circular indeterminate />
      <p>查詢中...</p>
    </div>
    <v-table v-else>
      <thead>
        <tr>
          <th>交易哈希</th>
          <th>時間</th>
          <th>數量</th>
          <th>From</th>
          <th>To</th>
          <th>Gas</th>
          <th>狀態</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="transaction in transactions" :key="transaction.hash">
          <td class="text-wrap">{{ transaction.hash.slice(0, 10) + '...' }}</td>
          <td>{{ formatTimestamp(transaction.timestamp) }}</td>
          <td>{{ transaction.amount }}</td>
          <td>{{ transaction.from.symbol }}</td>
          <td>{{ transaction.to.symbol === 'BSC-USD' ? 'USDT' : transaction.to.symbol }}</td>
          <td>{{ transaction.gas }}</td>
          <td>{{ transaction.status }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import { getTransactions } from '@/api/transactions.api'
  import type { TransactionResponse, Transaction } from '@/models/model'
  import { formatTimestamp } from '@/utils/timeConvert'
  const walletAddress = ref('')
  const error = ref('')
  const loading = ref(false)
  const transactions = ref<Transaction[]>([])
  const handleSearch = async () => {
    if (!walletAddress.value) {
      error.value = '請輸入錢包地址'
      return
    }
    loading.value = true
    const response: TransactionResponse = await getTransactions(walletAddress.value)
    transactions.value = response.transactions
    loading.value = false
  }
</script>

<style scoped>
  .container {
    padding: 60px;
    max-width: 1200px;
    margin: 0 auto;
  }
  .text-wrap {
    word-break: break-all;
  }
</style>
