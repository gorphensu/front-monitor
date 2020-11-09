<template>
  <div class="container">
    <Card>
      <PieCount></PieCount>
    </Card>
    <br>
    <Card>
      <CountList></CountList>
    </Card>
  </div>
</template>

<script>
import moment from 'moment'
import { fetchPageEngineCountSummary } from '@/api/page-engine-count'
import DataSet from '@antv/data-set'
import PieCount from './pie.vue'
import CountList from './count-list.vue'
export default {
  components: {
    PieCount,
    CountList
  }
}
</script>

<style lang="less" scoped>
</style>