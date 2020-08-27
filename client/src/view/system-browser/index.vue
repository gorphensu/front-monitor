<template>
  <div class="container system-browser-container">
    <Row>
      <Card shadow>
        <div class="filter-container">
          <time-bar
            class="time-bar"
            @change="timeChange"
            dateFormat="yyyy/MM"
            datePickerType="daterange"
            :displayTypeItem="false"
            :disabledDate="disabledDate"
            :shortcuts="shortcuts"
          ></time-bar>
        </div>
        <div class="chart-container">
          <Loading :isSpinShow="isShowLoading"></Loading>
          <div class="left-container">
            <v-chart :force-fit="true" :height="400" :scale="scale" :data="chartData">
              <v-tooltip :showTitle="false" data-key="item*percent" />
              <v-axis />
              <v-legend data-key="item" />
              <v-pie
                position="percent"
                color="item"
                :v-style="pieStyle"
                :label="labelConfig"
                :onClick="versionDetailHandler"
              />
              <v-coord type="theta" />
            </v-chart>
          </div>
          <div class="right-container">
            <v-chart :force-fit="true" :height="400" :scale="scale" :data="chartData2">
              <v-tooltip :showTitle="false" data-key="item*percent" />
              <v-axis />
              <v-legend data-key="item" />
              <v-pie position="percent" color="item" :v-style="pieStyle" :label="labelConfig" />
              <v-coord type="theta" />
            </v-chart>
          </div>
        </div>
      </Card>
    </Row>
  </div>
</template>

<script>
import moment from 'moment'
import { fetchSystemBrowserList } from '@/api/browser'
import TimeBar from '@/view/components/time-bar'
import Loading from '@/view/components/loading/loading.vue'
import DataSet from '@antv/data-set'
const DATE_FORMAT_BY_MONTH = 'YYYY/MM'

export default {
  name: 'system-browser',
  components: {
    TimeBar,
    Loading
  },
  data() {
    return {
      scale: [{
        dataKey: 'percent',
        min: 0,
        formatter: '.0%',
      }],
      originDatas: [],
      chartData: [],
      chartData2: [],
      labelConfig: ['percent', {
        formatter: (val, item) => {
          return item.point.item + ' :  ' + val
        }
      }],
      pieStyle: {
        stroke: '#fff',
        lineWidth: 1
      },
      dateRange: [
        moment(moment().subtract(2, 'months').format(DATE_FORMAT_BY_MONTH)).toDate(),
        moment(moment().subtract(-1, 'months').format(DATE_FORMAT_BY_MONTH)).subtract(1, 'days').toDate()
      ],
      isShowLoading: false,
      shortcuts: [{
        label: '当月',
        value: `${moment().format(DATE_FORMAT_BY_MONTH + '/01')}-${moment().set('date', 1).subtract(-1, 'months').subtract(1, 'days').format(DATE_FORMAT_BY_MONTH + '/01')}`
      }, {
        label: '最近三月',
        value: `${moment().set('date', 1).subtract(2, 'months').format(DATE_FORMAT_BY_MONTH + '/01')}-${moment().set('date', 1).subtract(-1, 'months').subtract(1, 'days').format(DATE_FORMAT_BY_MONTH + '/01')}`
      }, {
        label: '最近半年',
        value: `${moment().set('date', 1).subtract(5, 'months').format(DATE_FORMAT_BY_MONTH + '/01')}-${moment().set('date', 1).subtract(-1, 'months').subtract(1, 'days').format(DATE_FORMAT_BY_MONTH + '/01')}`
      }, {
        label: '最近一年',
        value: `${moment().set('date', 1).subtract(11, 'months').format(DATE_FORMAT_BY_MONTH + '/01')}-${moment().set('date', 1).subtract(-1, 'months').subtract(1, 'days').format(DATE_FORMAT_BY_MONTH + '/01')}`
      }]
    }
  },
  methods: {
    disabledDate(date) {
      let initdate = Date.now() - 30 * 24 * 60 * 60 * 1000
      return (date && date.valueOf() < initdate)
        || (date && date.valueOf() > Date.now())
    },
    async fetchData() {
      try {
        this.isShowLoading = true
        const res = await fetchSystemBrowserList({
          st: +moment(this.dateRange[0]),
          et: +moment(this.dateRange[1])
        })
        this.isShowLoading = false
        this.originDatas = res.data
        this.chartData = this.formatChartData(res.data)
        console.log(this.chartData)
      } catch (err) {
        console.error(err)
        this.isShowLoading = false
        this.chartData = []
      }
    },
    async timeChange(obj) {
      const {
        dateRange
      } = obj
      this.dateRange = dateRange
      this.fetchData()
    },
    formatChartData(datas = []) {
      let res = {}
      datas.forEach(data => {
        if (!res[data.browser.toLowerCase()]) {
          res[data.browser.toLowerCase()] = 1
        }
        res[data.browser.toLowerCase()] += data.total_count
      })
      let charDatas = Object.keys(res).map((key) => {
        return {
          item: key,
          count: res[key]
        }
      })
      const dv = new DataSet.View().source(charDatas)
      dv.transform({
        type: 'percent',
        field: 'count',
        dimension: 'item',
        as: 'percent'
      })
      return dv.rows
    },
    versionDetailHandler(e) {
      let { item } = e.data.point
      let datas = this.originDatas.filter((data) => {
        return data.browser.toLowerCase() === item
      })
      let res = datas.map((data) => {
        return {
          item: data.browser.toLowerCase() + ' ' + parseInt(data.browser_version),
          count: data.total_count,
          version: parseInt(data.browser_version)
        }
      }).sort((a, b) => {
        return a.version - b.version
      })
      const dv = new DataSet.View().source(res)
      dv.transform({
        type: 'percent',
        field: 'count',
        dimension: 'item',
        as: 'percent'
      })
      this.chartData2 = dv.rows
    }
  },
  async mounted() {
    this.fetchData()
  },
  beforeDestroy() {

  }
}
</script>

<style lang="less" scoped>
.system-browser-container {
  .chart-container {
    display: flex;
    justify-content: space-between;
    .left-container {
      width: 48%;
    }
    .right-container {
      width: 48%;
    }
  }
}
</style>