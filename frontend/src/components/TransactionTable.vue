<template>
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
        <tr v-for="tx in transactions" :key="tx.hash">
          <td class="text-wrap">{{ tx.hash.slice(0, 10) + '...' }}</td>
          <td>{{ formatTimestamp(tx.timestamp) }}</td>
          <td>{{ tx.amount }}</td>
          <td>{{ tx.from.symbol === 'BSC-USD' ? 'USDT' : tx.from.symbol }}</td>
          <td>{{ tx.to.symbol === 'BSC-USD' ? 'USDT' : tx.to.symbol }}</td>
          <td>{{ tx.gas }}</td>
          <td>{{ tx.status }}</td>
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
</script>

<style scoped>
  .text-wrap {
    word-break: break-all;
  }
</style>
