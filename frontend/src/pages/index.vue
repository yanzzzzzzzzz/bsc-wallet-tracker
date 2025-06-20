<template>
  <v-container class="container">
    <h1 class="text-center my-4">BSC 錢包每日交易查詢</h1>
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
      <div class="skeleton-container">
        <div class="summary-grid mb-4">
          <v-skeleton-loader v-for="i in 4" :key="i" type="card" class="summary-card" />
        </div>
        <v-skeleton-loader type="table" class="mt-4" />
      </div>
    </div>
    <div v-else>
      <div v-if="transactions.length !== 0">
        <TransactionSummary :summary="summary" />
        <TransactionTable :transactions="transactions" />
      </div>
    </div>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { getTransactions } from '@/api/transactions.api'
  import type { TransactionResponse, Transaction, Summary } from '@/models/model'
  import TransactionSummary from '../components/TransactionSummary.vue'
  import TransactionTable from '../components/TransactionTable.vue'

  interface RouteParams {
    address?: string
  }

  const route = useRoute()
  const router = useRouter()
  const walletAddress = ref('')
  const error = ref('')
  const loading = ref(false)
  const transactions = ref<Transaction[]>([])
  const summary = ref<Summary>()

  const fetchTransactions = async (address: string) => {
    if (!address) {
      error.value = '請輸入錢包地址'
      return
    }
    loading.value = true
    try {
      const response: TransactionResponse = await getTransactions(address)
      transactions.value = response.transactions
      summary.value = response.summary
    } catch (err) {
      error.value = '查詢失敗，請稍後再試'
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    const address = (route.params as RouteParams).address
    if (address) {
      walletAddress.value = address
      fetchTransactions(address)
    }
  })

  const handleSearch = async () => {
    if (!walletAddress.value) {
      error.value = '請輸入錢包地址'
      return
    }
    router.push(`/${walletAddress.value}`)
    await reset()
    await fetchTransactions(walletAddress.value)
  }
  const reset = async () => {
    transactions.value = []
    summary.value = undefined
    error.value = ''
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
  .skeleton-container {
    width: 100%;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }
  .summary-card {
    border-radius: 12px;
  }
</style>
