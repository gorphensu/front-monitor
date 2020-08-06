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
            <i-input class="pagecode-input" search  v-model="pagecode" placeholder="表单code" @on-enter="pagecodeChange"></i-input>
          </div>
          <div style="height: 400px;">
            <Loading :isSpinShow="isShowLoading"></Loading>
            <v-chart :force-fit="true" :height="height" :data="chartData">
              <v-tooltip :onChange="itemFormatter" />
              <v-axis />
              <v-point
                position="count_at_time*cost_time"
                :size="4"
                :shape="'circle'"
                :onClick="pointClickHandler"
                color="level"
              />
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
import { fetchPageEngineRenderList } from '@/api/page-engine-render'
import moment from 'moment'

const DATE_FORMAT_BY_DAY = 'YYYY/MM/DD'

export default {
  name: 'page-engine-render',
  components: {
    TimeBar,
    Loading
  },
  data() {
    return {
      isShowLoading: true,
      chartData: [],
      height: 400,
      dateRange: [moment(moment().format(DATE_FORMAT_BY_DAY)).toDate(), moment(moment().subtract(-1, 'days').format(DATE_FORMAT_BY_DAY)).toDate()],
      pagecode: ''
    }
  },
  methods: {
    pointClickHandler(eventPoint) {
      let data = eventPoint.data._origin
      debugger
      // let lifeDatas = this.chartData.filter(item => {
      //   return item.item_id === data.item_id
      // }).sort((a, b) => {
      //   return a.count_at_time_at - b.count_at_time_at
      // })
      // this.detailChartData = lifeDatas
    },
    itemFormatter(e) {
      let attrs = e.tooltip._attrs
      if (e.items) {
        const items = e.items[0]
        let val = items.value
        let pagecode = items.point._origin.pagecode
        let operationType = items.point._origin.operation_type
        let browser = items.point._origin.browser
        if (browser) {
          // major: "81"
          // name: "Chrome"
          // version: "81.0.4044.122"
          browser = JSON.parse(browser)
          browser = `${browser.name}:${browser.version}`
        }
        attrs.itemTpl = `
        <ul class="g2-tooltip-list-item">
          <li data-v-gtlv >表单：${pagecode}</li>
          <li data-v-gtlv >操作：${operationType}</li>
          <li data-v-gtlv>浏览器：${browser}</li>
          <li data-v-gtlv >时长：${this.MillisecondToDate(val)}</li>
        </ul>
        `
      }
    },

    getViewData(data = []) {
      // 1 计算平均值
      let length = data.length
      let average = data.reduce((prev, current) => {
        return prev + current.cost_time
      }, 0) / length
      data.forEach(item => {
        item.average_time = average
        if (item.cost_time > (average * 5)) {
          item.level = 'danger'
        } else if (item.cost_time > (average * 2)) {
          item.level = 'warning'
        } else {
          item.level = 'normal'
        }
        item.count_at_time_at = item.count_at_time
        item.count_at_time = moment(item.count_at_time * 1000).format('YYYY_MM_DD HH:mm:ss')
      })
      return data
    },

    async fetchListAndRender() {
      this.isShowLoading = true
      const res = await fetchPageEngineRenderList({
        st: +moment(this.dateRange[0]),
        et: +moment(this.dateRange[1]),
        pagecode: this.pagecode
      })
      this.chartData = this.getViewData(res.data)
      this.isShowLoading = false
    },

    async timeChange(obj) {
      const {
        dateRange
      } = obj
      this.dateRange = dateRange
      this.fetchListAndRender()
    },

    async pagecodeChange() {
      this.fetchListAndRender()
    },

    MillisecondToDate(msd) {
      let time = parseFloat(msd)
      if (time) {
        if (time < 1000) {
          time = time + 'ms'
        } else if (time >= 1000 && time < 60 * 1000) {
          time = (time / 1000).toFixed(3) + 's'
        } else if (time >= 60 * 1000 && time < 60 * 60 * 1000) {
          time = (time / (60 * 1000)).toFixed(3) + 'm'
        }
      }
      return time
    }
  },
  async mounted() {
    this.resize()
    const res = await fetchPageEngineRenderList({
      st: moment(moment().format('YYYY/MM/DD 00:00'), 'YYYY/MM/DD HH:mm:ss').unix() * 1000,
      et: moment(moment().format('YYYY/MM/DD 23:59'), 'YYYY/MM/DD HH:mm:ss').unix() * 1000,
      pagecode: this.pagechde
    })
    this.chartData = this.getViewData(res.data)
    this.isShowLoading = false
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