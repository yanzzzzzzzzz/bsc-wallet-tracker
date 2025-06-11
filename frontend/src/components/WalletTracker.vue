<template>
  <v-container class="py-8" max-width="800">
    <v-row class="mb-4" align="center">
      <v-col cols="12" sm="9">
        <v-text-field v-model="walletAddress" label="請輸入 BSC 錢包地址" hide-details />
      </v-col>
      <v-col cols="12" sm="3" class="text-sm-right">
        <v-btn color="primary" @click="onSearch">查詢</v-btn>
      </v-col>
    </v-row>

    <v-alert type="error" v-if="error" class="mb-4">{{ error }}</v-alert>
    <div class="text-center my-4" v-if="loading">
      <v-progress-circular indeterminate></v-progress-circular>
    </div>

    <div v-if="showResults">
      <h2 class="text-h5 mb-2">今日交易記錄</h2>

      <div v-if="progressShown" class="mb-6">
        <h3 class="text-subtitle-1 mb-2">BSC-USD 進度</h3>
        <v-progress-linear :model-value="progressPercent" height="20" rounded></v-progress-linear>
        <div class="d-flex justify-space-between text-caption mt-1">
          <span>{{ currentThreshold.toLocaleString() }}</span>
          <span>{{ nextThreshold.toLocaleString() }}</span>
        </div>
        <p class="text-caption mt-1">{{ progressText }}</p>
      </div>

      <div class="mb-6">
        <h3 class="text-subtitle-1 mb-2">交易彙總</h3>
        <v-table density="comfortable">
          <thead>
            <tr>
              <th>代幣</th>
              <th>交易次數</th>
              <th>總數量</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(info, symbol) in summary" :key="symbol">
              <td>{{ symbol }}</td>
              <td>{{ info.count }}</td>
              <td>{{ info.total.toFixed(4) }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>

      <div class="mb-6">
        <h3 class="text-subtitle-1 mb-2">交易明細</h3>
        <v-table density="comfortable">
          <thead>
            <tr>
              <th>Hash</th>
              <th>時間</th>
              <th>From</th>
              <th>To</th>
              <th>Gas Fee</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in transactions" :key="tx.hash">
              <td>{{ tx.hash }}</td>
              <td>{{ formatDate(tx.timestamp) }}</td>
              <td>{{ tx.from.symbol }}</td>
              <td>{{ tx.to.symbol }}</td>
              <td>{{ tx.gas.toFixed(8) }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </div>

    <div class="mb-6">
      <h3 class="text-subtitle-1 mb-2">交易分數計算機</h3>
      <v-row class="align-center">
        <v-col cols="12" sm="3">
          <v-select
            v-model.number="targetScore"
            :items="scoreOptions"
            label="目標分數"
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="3">
          <v-text-field
            v-model.number="currentVolume"
            label="當前交易量 (BSC-USD)"
            type="number"
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="3">
          <v-text-field
            v-model.number="tradeVolume"
            label="每次交易量 (BSC-USD)"
            type="number"
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="3" class="text-sm-right">
          <v-btn color="primary" @click="onCalc">計算</v-btn>
        </v-col>
      </v-row>
      <p class="text-body-2">{{ calcFormula }}</p>
      <p class="text-body-2">{{ calcResult }}</p>
    </div>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'

  interface SummaryInfo {
    count: number
    total: number
  }

  interface TxTokenInfo {
    symbol: string
  }

  interface Transaction {
    hash: string
    timestamp: number
    gas: number
    from: TxTokenInfo
    to: TxTokenInfo
  }

  const route = useRoute()
  const router = useRouter()

  const walletAddress = ref('')
  const loading = ref(false)
  const error = ref('')
  const summary = ref<Record<string, SummaryInfo>>({})
  const transactions = ref<Transaction[]>([])

  const currentThreshold = ref(0)
  const nextThreshold = ref(2)
  const progressPercent = ref(0)
  const progressText = ref('')

  const targetScore = ref<number | null>(null)
  const currentVolume = ref<number | null>(null)
  const tradeVolume = ref<number | null>(null)
  const calcFormula = ref('')
  const calcResult = ref('')

  const scoreOptions = Array.from({ length: 20 }, (_, i) => ({
    title: `${i + 1} 分 - 累積 ${2 ** (i + 1)}`,
    value: i + 1,
  }))

  const showResults = computed(() => transactions.value.length > 0)
  const progressShown = computed(() => progressText.value !== '')

  onMounted(() => {
    const addr = route.query.wallet_address as string | undefined
    if (addr) {
      walletAddress.value = addr
      fetchTransactions(addr)
    }
  })

  function formatDate(ts: number) {
    return new Date(ts * 1000).toLocaleString('zh-TW')
  }

  function updateQuery(addr: string) {
    router.replace({ query: addr ? { wallet_address: addr } : {} })
  }

  async function onSearch() {
    if (!walletAddress.value) return
    updateQuery(walletAddress.value)
    await fetchTransactions(walletAddress.value)
  }

  async function fetchTransactions(addr: string) {
    loading.value = true
    error.value = ''
    try {
      const res = await fetch(`/transactions/${addr}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || '查詢失敗')
      }
      const data = await res.json()
      summary.value = data.summary
      transactions.value = data.transactions

      const busd = data.summary['BSC-USD'] ? data.summary['BSC-USD'].total : 0
      let points = 0
      currentThreshold.value = 0
      nextThreshold.value = 2
      while (busd >= nextThreshold.value) {
        points++
        currentThreshold.value = nextThreshold.value
        nextThreshold.value *= 2
      }
      const remaining = Math.max(0, nextThreshold.value - busd)
      progressPercent.value = Math.min(
        100,
        ((busd - currentThreshold.value) / (nextThreshold.value - currentThreshold.value)) * 100
      )
      progressText.value = `目前 ${points} 分，累積 ${busd.toFixed(2)} BSC-USD，距離下一階段還差 ${remaining.toFixed(2)} BSC-USD`

      currentVolume.value = parseFloat(busd.toFixed(2))
      const nextScore = Math.min(20, Math.log2(nextThreshold.value))
      targetScore.value = nextScore
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  function onCalc() {
    if (!targetScore.value || currentVolume.value === null || !tradeVolume.value) {
      calcResult.value = '請完整輸入資料'
      calcFormula.value = ''
      return
    }

    const targetVolume = 2 ** targetScore.value
    const times = Math.ceil((targetVolume - currentVolume.value) / (tradeVolume.value * 2))
    calcFormula.value = `(${targetVolume} - ${currentVolume.value}) / (${tradeVolume.value} x 2) = ${times}`
    calcResult.value = `還需交易 ${times} 次`
  }
</script>

<style scoped>
  .text-sm-right {
    text-align: right;
  }
</style>
