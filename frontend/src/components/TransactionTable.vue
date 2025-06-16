<template>
  <section>
    <v-table>
      <thead>
        <tr>
          <th>交易Hash</th>
          <th>時間</th>
          <th>From</th>
          <th>To</th>
          <th>Gas</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tx in transactions" :key="tx.hash">
          <td class="text-wrap">{{ tx.hash.slice(0, 10) + '...' }}</td>
          <td>{{ formatTimestamp(tx.timestamp) }}</td>
          <td>
            <div>{{ tx.from.symbol }}</div>
            <div class="amount">{{ formatAmount(tx.from.amount) }}</div>
          </td>
          <td>
            <div>{{ tx.to.symbol }}</div>
            <div class="amount">{{ formatAmount(tx.to.amount) }}</div>
          </td>
          <td>{{ tx.gas }}</td>
        </tr>
      </tbody>
    </v-table>
  </section>
</template>

<script lang="ts" setup>
  import type { Transaction } from '@/models/model'
  import { formatTimestamp } from '@/utils/timeConvert'

  defineProps<{
    transactions: Transaction[]
  }>()

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount)
  }
</script>

<style scoped>
  .text-wrap {
    word-break: break-all;
  }

  .amount {
    font-family: 'Roboto Mono', monospace;
    color: #666;
    font-size: 0.9em;
    margin-top: 4px;
  }
</style>
