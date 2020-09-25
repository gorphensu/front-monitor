<template>
  <div class="container page-engine-container">
    <Row>
      <i-col span="24">
        <Card shadow>
          <div class="filter-container">
            <time-bar
              class="time-bar"
              @change="timeChange"
              dateFormat="yyyy/MM/dd HH:mm"
              datePickerType="datetimerange"
              :displayTypeItem="false"
            ></time-bar>
            <i-input
              class="pagecode-input"
              search
              v-model="tenantid"
              placeholder="租户code"
              @on-enter="pagecodeChange"
            ></i-input>
            <i-input
              class="pagecode-input"
              search
              v-model="pagecode"
              placeholder="表单code"
              @on-enter="pagecodeChange"
            ></i-input>
            <i-select
              class="pagecode-input"
              v-model="loadedTimeType"
              placeholder="加载所需时间"
              clearable
              @on-change="pagecodeChange"
            >
              <i-option
                v-for="(item, index) in loadedTimeTypes"
                :key="index"
                :value="item.value"
              >{{item.label}}</i-option>
            </i-select>
          </div>
          <span>表单加载耗时分布图</span>
          <div style="height: 400px">
            <Loading :isSpinShow="isShowLoading"></Loading>
            <v-chart :force-fit="true" :height="400" :data="pieChartData" :scale="pieScale">
              <v-pie position="percent" color="type" :label="pieLabel" :select="false" />
              <v-coord type="theta" :radius="0.75" :innerRadius="0.6" />
            </v-chart>
          </div>
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
const DATE_FORMAT_BY_DAY = 'YYYY/MM/DD'

export default {
  name: 'page-engine-render',
  components: {
    TimeBar,
    Loading,
    Modal
  },
  data() {
    return {
      isShowLoading: true,
      chartData: [],
      height: 400,
      dateRange: [moment(moment().format(DATE_FORMAT_BY_DAY)).toDate(), moment(moment().subtract(-1, 'days').format(DATE_FORMAT_BY_DAY)).toDate()],
      pagecode: '',
      tenantid: '',
      loadedTimeType: '',
      loadedTimeTypes: [{
        value: 3000,
        label: '3秒以上'
      }, {
        value: 5000,
        label: '5秒以上'
      }, {
        value: 8000,
        label: '8秒以上'
      }, {
        value: 10000,
        label: '10秒以上'
      }],
      pieChartData: [],
      pieScale: [{
        dataKey: 'percent',
        min: 0,
        formatter: '.0%'
      }],
      pieLabel: ['percent', {
        formatter: (val, item) => {
          return item.point.type + ':  ' + val
        }
      }]
    }
  },
  async mounted() {
    this.updatePieData()
  },
  methods: {
    async updatePieData() {
      try {
        let now = moment()
        let start = +moment(this.dateRange[0])
        let end = +moment(this.dateRange[1])
        // 如果开始时间是今天，需要提前一天，因为今天的数据需要第二天0时才提交统计
        if (now - start < 86400000) {
          start = start - 86400000
        }
        let res = await fetchSummaryPageEngineOnloadSummary({
          st: start,
          et: end,
          tenantid: this.tenantid
        })
        let datas = Object.keys(res.data).map(key => {
          let prop = key
          if (prop === '0-3') {
            prop = '3秒内'
          } else if (prop === '3-5') {
            prop = '3-5秒'
          } else if (prop === '5-8') {
            prop = '5-8秒'
          } else if (prop === '8-10') {
            prop = '8-10秒'
          } else {
            prop = '10秒以上'
          }
          return {
            value: res['data'][key],
            type: prop
          }
        })
        const dv = new DataSet.View().source(datas)
        dv.transform({
          type: 'percent',
          field: 'value',
          dimension: 'type',
          as: 'percent'
        })
        this.pieChartData = dv.rows
        this.isShowLoading = false
      } catch (e) {
        console.error(e)
        this.pieChartData = []
        this.isShowLoading = false
      }
    },
    async timeChange(obj) {
      const {
        dateRange
      } = obj
      this.dateRange = dateRange
      this.updatePieData()
    },
    async pagecodeChange() {
      this.updatePieData()
    }
  }

}
</script>

<style lang="less" scoped>
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