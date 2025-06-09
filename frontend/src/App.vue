<template>
  <div class="container">
    <h1>BSC 錢包交易追蹤器</h1>

    <div class="search-box">
      <form @submit.prevent="onSubmit" id="searchForm">
        <input
          type="text"
          id="walletAddress"
          v-model="walletAddress"
          placeholder="請輸入 BSC 錢包地址"
          required
        />
        <button type="submit">查詢</button>
      </form>
    </div>

    <div id="loading" class="loading" v-if="loading">載入中...</div>
    <div id="error" class="error" v-if="error">{{ error }}</div>

    <div class="calculator-section">
      <h3>交易分數計算機</h3>
      <div class="calc-form">
        <select id="targetScore" v-model.number="targetScore">
          <option value="" disabled>選擇目標分數</option>
          <option v-for="n in 20" :key="n" :value="n">
            {{ n }} 分 - 累積 {{ 2 ** n }}
          </option>
        </select>
        <input
          type="number"
          id="currentVolume"
          v-model.number="currentVolume"
          placeholder="當前交易量 (BSC-USD)"
        />
        <input
          type="number"
          id="tradeVolume"
          v-model.number="tradeVolume"
          placeholder="每次交易量 (BSC-USD)"
        />
        <button id="calcButton" type="button" @click="calcTrade">計算</button>
      </div>
      <p id="calcFormula">{{ calcFormula }}</p>
      <p id="calcResult">{{ calcResult }}</p>
    </div>

    <div id="results" v-if="transactions.length">
      <h2>今日交易記錄</h2>

      <div class="progress-section" id="progressSection" v-if="progress">
        <h3>BSC-USD 進度</h3>
        <div class="progress-bar">
          <div id="progressFill" class="progress-fill" :style="{ width: progress.percent + '%' }"></div>
        </div>
        <div class="progress-labels">
          <span id="currentThresholdLabel">{{ progress.currentThreshold.toLocaleString() }}</span>
          <span id="nextThresholdLabel">{{ progress.nextThreshold.toLocaleString() }}</span>
        </div>
        <p id="progressText">
          目前 {{ progress.points }} 分，累積 {{ busd.toFixed(2) }} BSC-USD，距離下一階段還差
          {{ progress.remaining.toFixed(2) }} BSC-USD
        </p>
      </div>

      <div class="summary-section">
        <h3>交易彙總</h3>
        <div id="summary">
          <table>
            <tr>
              <th>代幣</th>
              <th>交易次數</th>
              <th>總數量</th>
            </tr>
            <tr v-for="(info, symbol) in summary" :key="symbol">
              <td>{{ symbol }}</td>
              <td>{{ info.count }}</td>
              <td>{{ info.total.toFixed(4) }}</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="transactions-section">
        <h3>交易明細</h3>
        <div id="transactions">
          <table>
            <tr>
              <th>Hash</th>
              <th>時間</th>
              <th>From</th>
              <th>To</th>
              <th>Gas Fee</th>
            </tr>
            <tr v-for="tx in transactions" :key="tx.hash + String(tx.timestamp)">
              <td>{{ tx.hash }}</td>
              <td>{{ new Date(tx.timestamp * 1000).toLocaleString('zh-TW') }}</td>
              <td>{{ tx.from.symbol }}</td>
              <td>{{ tx.to.symbol }}</td>
              <td>{{ Number(tx.gas).toFixed(8) }}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface TokenInfo {
  address?: string;
  symbol?: string;
  decimals?: number;
}
interface Tx {
  hash: string;
  timestamp: number;
  gas: number;
  status: string;
  amount: number;
  from: TokenInfo;
  to: TokenInfo;
}
interface SummaryInfo {
  count: number;
  total: number;
}

const walletAddress = ref('');
const loading = ref(false);
const error = ref('');
const summary = ref<Record<string, SummaryInfo>>({});
const transactions = ref<Tx[]>([]);

const currentVolume = ref(0);
const targetScore = ref<number | ''>('');
const tradeVolume = ref(0);
const calcFormula = ref('');
const calcResult = ref('');

const busd = computed(() => summary.value['BSC-USD']?.total ?? 0);
const progress = computed(() => {
  const busdValue = busd.value;
  if (!busdValue) return null;
  let points = 0;
  let currentThreshold = 0;
  let nextThreshold = 2;
  while (busdValue >= nextThreshold && points < 20) {
    points++;
    currentThreshold = nextThreshold;
    nextThreshold *= 2;
  }
  const remaining = Math.max(0, nextThreshold - busdValue);
  const percent = Math.min(
    100,
    ((busdValue - currentThreshold) / (nextThreshold - currentThreshold)) * 100
  );
  return { points, currentThreshold, nextThreshold, remaining, percent };
});

function updateURL(addr: string) {
  const url = new URL(window.location.href);
  if (addr) {
    url.searchParams.set('wallet_address', addr);
  } else {
    url.searchParams.delete('wallet_address');
  }
  window.history.pushState({}, '', url);
}

async function fetchTransactions(address: string) {
  loading.value = true;
  error.value = '';
  transactions.value = [];
  summary.value = {};
  try {
    const res = await fetch(`/transactions/${address}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || '查詢失敗');
    }
    transactions.value = data.transactions;
    summary.value = data.summary;

    currentVolume.value = busd.value;
    let nextThreshold = 2;
    while (currentVolume.value >= nextThreshold && nextThreshold < 2 ** 20) {
      nextThreshold *= 2;
    }
    targetScore.value = Math.min(20, Math.log2(nextThreshold));
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function onSubmit() {
  updateURL(walletAddress.value);
  await fetchTransactions(walletAddress.value);
}

function calcTrade() {
  if (!targetScore.value || isNaN(currentVolume.value) || !tradeVolume.value) {
    calcResult.value = '請完整輸入資料';
    calcFormula.value = '';
    return;
  }
  const targetVolume = Math.pow(2, Number(targetScore.value));
  const times = Math.ceil((targetVolume - currentVolume.value) / (tradeVolume.value * 2));
  calcFormula.value = `(${targetVolume} - ${currentVolume.value}) / (${tradeVolume.value} x 2) = ${times}`;
  calcResult.value = `還需交易 ${times} 次`;
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const addr = params.get('wallet_address');
  if (addr) {
    walletAddress.value = addr;
    fetchTransactions(addr);
  }
});
</script>
