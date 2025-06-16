<template>
  <section class="mb-4">
    <h2 class="mb-4">交易總覽</h2>
    <v-row>
      <v-col cols="12" sm="6" md="3" v-for="item in summaryItems" :key="item.label">
        <v-card class="mx-auto" elevation="2">
          <v-card-text>
            <div class="text-h6 mb-2">{{ item.label }}</div>
            <div class="text-h6">{{ item.value }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </section>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import _ from 'lodash'
  import { getPowerOfTwo } from '@/utils/points'
  import type { Summary } from '@/models/model'

  const props = defineProps<{
    summary: Summary | undefined
    totalGas: number | undefined
  }>()

  const totalVolume = computed(() => {
    return props.summary?.total_volume == null ? 0 : _.round(props.summary.total_volume, 1)
  })

  const totalProfit = computed(() => {
    return props.summary?.total_profitAndLoss == null
      ? 0
      : _.round(props.summary.total_profitAndLoss, 1)
  })

  const todayPoints = computed(() => {
    return props.summary?.total_volume == null ? 0 : getPowerOfTwo(props.summary.total_volume)
  })

  const summaryItems = computed(() => [
    { label: '今日交易量', value: totalVolume.value },
    { label: '今日交易盈虧', value: totalProfit.value },
    { label: '消耗手續費Gas', value: props.totalGas },
    { label: '今日積分', value: todayPoints.value },
  ])
</script>
