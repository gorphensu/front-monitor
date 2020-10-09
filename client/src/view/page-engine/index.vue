<template>
  <div class="container page-engine-container">
    <Row>
      <i-col span="24">
        <Card shadow>
          <Pie></Pie>
        </Card>
        <Card shadow>
          <List @row-click="handleListRowClick"></List>
        </Card>
        <Card shadow>
          <DetailList ref="detailList"></DetailList>
        </Card>
      </i-col>
    </Row>
  </div>
</template>

<script>
import TimeBar from '@/view/components/time-bar'
import Loading from '@/view/components/loading/loading.vue'
import moment from 'moment'
import DataSet from '@antv/data-set'
import { Modal } from 'iview'
import { fetchSummaryPageEngineOnloadSummary } from '@/api/page-engine-onload'
import Pie from './pie.vue'
import List from './list.vue'
import DetailList from './detail-list.vue'
const DATE_FORMAT_BY_DAY = 'YYYY/MM/DD'

export default {
  name: 'page-engine-render',
  components: {
    TimeBar,
    Loading,
    Modal,
    Pie,
    List,
    DetailList
  },
  data() {
    return {}
  },
  methods: {
    handleListRowClick(rowData, filterData) {
      this.$refs['detailList'].updateList(rowData, filterData)
    }
  }

}
</script>

<style lang="less">
.page-engine-container .filter-container {
  position: relative;
  display: flex;
  justify-content: space-around;
}
.page-engine-container .time-bar {
  width: 700px;
}
.page-engine-container .pagecode-input {
  width: 200px;
}
</style>