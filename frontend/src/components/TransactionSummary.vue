<template>
  <section class="summary-grid mb-4">
    <v-card
      v-for="item in summaryItems"
      :key="item.label"
      class="summary-card"
      :color="item.bgColor"
      elevation="4"
    >
      <v-card-text>
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="text-subtitle-2">{{ item.label }}</div>
          <v-icon :color="item.color" size="20">{{ item.icon }}</v-icon>
        </div>
        <div class="text-h5 font-weight-bold" :style="{ color: item.color }">{{ item.value }}</div>
        <div class="text-caption" v-if="item.sub">{{ item.sub }}</div>
      </v-card-text>
    </v-card>
  </section>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import _ from 'lodash'
  import { getPowerOfTwo, getNextPowerOfTwo } from '@/utils/points'
  import type { Summary } from '@/models/model'
  const props = defineProps<{
    summary: Summary | undefined
  }>()

  const totalVolume = computed(() => _.round(props.summary?.total_volume ?? 0, 2))
  const totalProfit = computed(() => _.round(props.summary?.total_profitAndLoss ?? 0, 2))
  const totalGasBNB = computed(() => _.round(props.summary?.total_gas_fee ?? 0, 6))
  const totalGasUSD = computed(() => _.round(props.summary?.total_gas_fee_usd ?? 0, 3))
  const todayPoints = computed(() => getPowerOfTwo(props.summary?.total_volume ?? 0))
  const nextPoints = computed(() =>
    _.round(getNextPowerOfTwo(totalVolume.value) - totalVolume.value, 2)
  )
  const summaryItems = computed(() => [
    {
      label: '今日交易量',
      value: `$${totalVolume.value}`,
      sub: `下一階還差 $${nextPoints.value}`,
      icon: 'mdi-chart-line',
      color: 'white',
      bgColor: 'grey-darken-4',
    },
    {
      label: '今日損益',
      value: `$${totalProfit.value}`,
      sub: '今日產生損益',
      icon: 'mdi-currency-usd',
      color: totalProfit.value < 0 ? 'orange' : 'green',
      bgColor: 'grey-darken-4',
    },
    {
      label: 'Gas(BNB)',
      value: `${totalGasBNB.value}`,
      sub: `≈ $${totalGasUSD.value}`,
      icon: 'mdi-fire',
      color: 'purple',
      bgColor: 'grey-darken-4',
    },
    {
      label: '今日積分',
      value: `+${todayPoints.value} 積分`,
      sub: '交易量分數',
      icon: 'mdi-star',
      color: 'orange',
      bgColor: 'grey-darken-4',
    },
  ])
</script>

<style scoped>
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }

  .summary-card {
    border-radius: 12px;
    padding: 16px;
  }
</style>
