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
        <TransactionSummary :summary="summary" :totalGas="totalGas" />
        <TransactionTable :transactions="transactions" />
      </div>
    </div>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { getTransactions } from '@/api/transactions.api'
  import type { TransactionResponse, Transaction, Summary } from '@/models/model'
  import TransactionSummary from '../components/TransactionSummary.vue'
  import TransactionTable from '../components/TransactionTable.vue'
  import _ from 'lodash'

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

  const totalGas = computed(() => {
    return _.round(
      transactions.value.reduce((acc, tx) => acc + tx.gas, 0),
      6
    )
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
</style>
