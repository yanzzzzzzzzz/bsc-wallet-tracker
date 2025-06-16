<template>
  <v-container class="container">
    <h1 class="text-center my-4">BSC 錢包交易查詢</h1>
    <div class="d-flex justify-center">
      <v-text-field
        label="錢包地址"
        variant="solo-filled"
        v-model="walletAddress"
        class="mr-1"
        @keyup.enter="handleSearch"
        append-inner-icon="mdi-magnify"
        @click:append-inner="handleSearch"
      />
    </div>
    <v-alert type="error" v-if="error" class="mb-4">{{ error }}</v-alert>
    <div v-if="loading" class="text-center my-4">
      <v-progress-circular indeterminate />
      <p>查詢中...</p>
    </div>
    <div v-else>
      <div v-if="transactions.length !== 0">
        <section class="mb-4">
          <h2 class="mb-4">交易總覽</h2>
          <v-row>
            <v-col cols="12" sm="6" md="3">
              <v-card class="mx-auto" elevation="2">
                <v-card-text>
                  <div class="text-h6 mb-2">今日交易量</div>
                  <div class="text-h6">{{ summary?.total_volume }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card class="mx-auto" elevation="2">
                <v-card-text>
                  <div class="text-h6 mb-2">今日交易盈虧</div>
                  <div class="text-h6">{{ summary?.total_profitAndLoss }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card class="mx-auto" elevation="2">
                <v-card-text>
                  <div class="text-h6 mb-2">消耗手續費Gas</div>
                  <div class="text-h6">{{ totalGas }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card class="mx-auto" elevation="2">
                <v-card-text>
                  <div class="text-h6 mb-2">今日積分</div>
                  <div class="text-h6">{{ todayPoints }}</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </section>
        <section>
          <v-table>
            <thead>
              <tr>
                <th>交易Hash</th>
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
                <td>
                  {{ transaction.from.symbol === 'BSC-USD' ? 'USDT' : transaction.from.symbol }}
                </td>
                <td>{{ transaction.to.symbol === 'BSC-USD' ? 'USDT' : transaction.to.symbol }}</td>
                <td>{{ transaction.gas }}</td>
                <td>{{ transaction.status }}</td>
              </tr>
            </tbody>
          </v-table>
        </section>
      </div>
    </div>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref, computed } from 'vue'
  import { getTransactions } from '@/api/transactions.api'
  import type { TransactionResponse, Transaction, TransactionSummary } from '@/models/model'
  import { formatTimestamp } from '@/utils/timeConvert'

  const walletAddress = ref('')
  const error = ref('')
  const loading = ref(false)
  const transactions = ref<Transaction[]>([])
  const summary = ref<TransactionSummary>()

  const totalGas = computed(() => {
    return transactions.value.reduce((acc, tx) => acc + tx.gas, 0)
  })

  const todayPoints = computed(() => {
    return 1000
  })

  const handleSearch = async () => {
    if (!walletAddress.value) {
      error.value = '請輸入錢包地址'
      return
    }
    loading.value = true
    const response: TransactionResponse = await getTransactions(walletAddress.value)
    transactions.value = response.transactions
    summary.value = response.summary
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
