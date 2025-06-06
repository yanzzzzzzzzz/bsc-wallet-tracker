<template>
  <v-app>
    <v-container class="py-8">
      <v-row justify="center" class="mb-8">
        <v-col cols="12">
          <h1 class="text-center">BSC 錢包交易追蹤器</h1>
        </v-col>
        <v-col cols="12">
          <v-form @submit.prevent="search">
            <v-row align="center" no-gutters>
              <v-col cols="12" md="8">
                <v-text-field
                  v-model="walletAddress"
                  label="請輸入 BSC 錢包地址"
                  required
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="4" class="text-md-left text-center">
                <v-btn color="primary" type="submit">查詢</v-btn>
              </v-col>
            </v-row>
          </v-form>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="6">
          <v-card class="pa-4 mb-6">
            <h3>交易分數計算機</h3>
            <v-row class="calc-form" no-gutters>
              <v-col cols="12" md="4">
                <v-select
                  v-model="targetScore"
                  :items="scores"
                  label="目標分數"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="currentVolume"
                  label="當前交易量 (BSC-USD)"
                  type="number"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="tradeVolume"
                  label="每次交易量 (BSC-USD)"
                  type="number"
                  hide-details
                />
              </v-col>
            </v-row>
            <v-row class="mt-2" no-gutters>
              <v-col cols="12">
                <v-btn color="primary" @click="calc">計算</v-btn>
              </v-col>
            </v-row>
            <p class="mt-2">{{ formula }}</p>
            <p>{{ result }}</p>
          </v-card>
        </v-col>
        <v-col cols="12" md="6" v-if="hasBusd">
          <v-card class="pa-4 mb-6">
            <h3>BSC-USD 進度</h3>
            <v-progress-linear :model-value="percent" height="20" class="mb-2" />
            <div class="progress-labels d-flex justify-space-between mb-2">
              <span>{{ currentThreshold.toLocaleString() }}</span>
              <span>{{ nextThreshold.toLocaleString() }}</span>
            </div>
            <p>{{ progressText }}</p>
          </v-card>
        </v-col>
      </v-row>

      <v-row v-if="error" class="mb-4">
        <v-col cols="12">
          <v-alert type="error" dense>{{ error }}</v-alert>
        </v-col>
      </v-row>

      <v-row v-if="loading" class="mb-4">
        <v-col cols="12" class="text-center">載入中...</v-col>
      </v-row>

      <v-row v-if="results">
        <v-col cols="12" class="mb-6">
          <h2>今日交易記錄</h2>
        </v-col>

        <v-col cols="12" class="mb-6">
          <h3>交易彙總</h3>
          <v-table>
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
        </v-col>

        <v-col cols="12">
          <h3>交易明細</h3>
          <v-table>
            <thead>
              <tr>
                <th>Hash</th>
                <th>時間</th>
                <th>兌換</th>
                <th>Gas Fee</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in transactions" :key="tx.hash">
                <td>{{ tx.hash }}</td>
                <td>{{ formatDate(tx.timestamp) }}</td>
                <td>{{ tx.from.symbol }} → {{ tx.to.symbol }}</td>
                <td>{{ Number(tx.gas).toFixed(8) }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-col>
      </v-row>
    </v-container>
  </v-app>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';

const walletAddress = ref('');
const loading = ref(false);
const error = ref('');
const results = ref(false);
const summary = ref<Record<string, { count: number; total: number }>>({});
const transactions = ref<any[]>([]);

const targetScore = ref<number | null>(null);
const currentVolume = ref(0);
const tradeVolume = ref(0);
const formula = ref('');
const result = ref('');

const scores = Array.from({ length: 20 }, (_, i) => ({ text: `${i + 1} 分`, value: i + 1 }));

async function search() {
  if (!walletAddress.value) return;
  loading.value = true;
  error.value = '';
  results.value = false;
  try {
    const res = await fetch(`/transactions/${walletAddress.value}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '查詢失敗');
    summary.value = data.summary;
    transactions.value = data.transactions;
    results.value = true;
    updateProgress();
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function calc() {
  if (!targetScore.value || isNaN(currentVolume.value) || !tradeVolume.value) {
    result.value = '請完整輸入資料';
    formula.value = '';
    return;
  }
  const targetVolume = Math.pow(2, targetScore.value);
  const times = Math.ceil((targetVolume - currentVolume.value) / (tradeVolume.value * 2));
  formula.value = `(${targetVolume} - ${currentVolume.value}) / (${tradeVolume.value} x 2) = ${times}`;
  result.value = `還需交易 ${times} 次`;
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString('zh-TW');
}

const hasBusd = computed(() => 'BSC-USD' in summary.value);
const busd = computed(() => (hasBusd.value ? summary.value['BSC-USD'].total : 0));
const currentThreshold = ref(0);
const nextThreshold = ref(2);
const percent = ref(0);
const progressText = ref('');

function updateProgress() {
  let points = 0;
  let current = 0;
  let next = 2;
  while (busd.value >= next) {
    points++;
    current = next;
    next *= 2;
  }
  const remaining = Math.max(0, next - busd.value);
  percent.value = Math.min(100, ((busd.value - current) / (next - current)) * 100);
  currentThreshold.value = current;
  nextThreshold.value = next;
  progressText.value = `目前 ${points} 分，累積 ${busd.value.toFixed(2)} BSC-USD，距離下一階段還差 ${remaining.toFixed(2)} BSC-USD`;
  currentVolume.value = parseFloat(busd.value.toFixed(2));
  const nextScore = Math.min(20, Math.log2(next));
  targetScore.value = nextScore;
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const addr = params.get('wallet_address');
  if (addr) {
    walletAddress.value = addr;
    search();
  }
});
</script>

<style scoped>
.calc-form > * {
  padding-right: 8px;
}
.progress-labels {
  font-size: 0.875rem;
}
</style>
