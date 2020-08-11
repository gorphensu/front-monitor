<template>
  <div class="container vue-component-render-container">
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
            <SelectComponentType
              class="component-select"
              v-model="componentType"
              @input="componentChange"
            ></SelectComponentType>
          </div>
          <div style="height:400px">
            <Loading :isSpinShow="isSpinShowDetail"></Loading>
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
          <div style="height:400px; display:flex;">
            <v-chart
              :force-fit="true"
              style="width: 50%;min-width: 50%;max-width: 50%;"
              :height="height"
              :data="detailChartData"
            >
              <v-tooltip :onChange="itemFormatter" />
              <v-axis />
              <v-point
                position="operation_type*cost_time"
                :size="4"
                :shape="'circle'"
                :onClick="pointDetailClickHandler"
                color="level"
              />
            </v-chart>
          </div>
          <div style="height: 400px; display:flex; justify-content: space-around;">
            <div class="viewrule-container" style="background: #efefef;width: 49%;overflow: auto;">
              <pre>
                <code>{{viewRule}}</code>
              </pre>
            </div>
            <div class="detail-container" style="background: #efefef;width: 49%;overflow: auto;">
              <pre>
                <code>{{detail}}</code>
              </pre>
            </div>
          </div>
        </Card>
      </i-col>
    </Row>
  </div>
</template>

<script>
import TimeBar from '@/view/components/time-bar'
import Loading from '@/view/components/loading/loading.vue'
import SelectComponentType from '@/view/components/select-component-type/index.vue'
import { fetchVueComponentRenderList } from '@/api/vue-component-render'
import moment from 'moment'
import DataSet from '@antv/data-set'

const DATE_FORMAT_BY_DAY = 'YYYY/MM/DD'

export default {
  name: 'vue-component-render',
  components: {
    TimeBar,
    Loading,
    SelectComponentType
  },
  data() {
    return {
      isSpinShowDetail: true,
      chartData: [],
      average: 0,
      lineScale: [{
        dataKey: 'cost_time',
        min: 0
      }, {
        dataKey: 'average_time',
        min: 0
      }],
      height: 400,
      pointStyle: {
        color: 'red'
      },
      componentType: 'dropdownbox',
      dateRange: [moment(moment().format(DATE_FORMAT_BY_DAY)).toDate(), moment(moment().subtract(-1, 'days').format(DATE_FORMAT_BY_DAY)).toDate()],
      detailChartData: [],
      detail: '',
      viewRule: ''
    }
  },
  methods: {
    pointClickHandler(eventPoint) {
      let data = eventPoint.data._origin
      let lifeDatas = this.chartData.filter(item => {
        return item.item_id === data.item_id
      }).sort((a, b) => {
        return a.count_at_time_at - b.count_at_time_at
      })
      this.detailChartData = lifeDatas
    },
    pointDetailClickHandler(eventPoint) {
      let data = eventPoint.data._origin
      if (data.detail) {
        try {
          this.detail = JSON.stringify(JSON.parse(data.detail), null, 2)
        } catch (e) {
          this.detail = data.detail
        }
      }
      if (this.detailChartData[0].detail) {
        try {
          this.viewRule = JSON.parse(this.detailChartData[0].detail)
          if (typeof this.viewRule === 'string') {
            this.viewRule = JSON.parse(this.viewRule)
          }
          this.viewRule = JSON.stringify({
            pagecode: this.detailChartData[0].pagecode,
            viewRule: this.viewRule,
            ucid: data.ucid,
            browser: data.browser
          }, null, 2)
        } catch (e) {
          this.viewRule = data.detailChartData[0].detail
        }
      }
    },
    itemFormatter(e) {
      let attrs = e.tooltip._attrs
      if (e.items) {
        const items = e.items[0]
        let val = items.value
        let componentType = items.point._origin.component_type
        let operationType = items.point._origin.operation_type
        let browser = items.point._origin.browser
        let url = items.point._origin.url || ''
        if (browser) {
          // major: "81"
          // name: "Chrome"
          // version: "81.0.4044.122"
          browser = JSON.parse(browser)
          browser = `${browser.name}:${browser.version}`
        }
        attrs.itemTpl = `
        <ul class="g2-tooltip-list-item">
          <li data-v-gtlv >类型：${componentType}</li>
          <li data-v-gtlv >操作：${operationType}</li>
          <li data-v-gtlv>浏览器：${browser}</li>
          <li data-v-gtlv >时长：${this.MillisecondToDate(val)}</li>
          <li data-v-gtlv>浏览地址：${url}</li>
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
      this.isSpinShowDetail = true
      const res = await fetchVueComponentRenderList({
        st: +moment(this.dateRange[0]),
        et: +moment(this.dateRange[1]),
        component_type: this.componentType
      })
      this.chartData = this.getViewData(res.data)
      this.isSpinShowDetail = false
    },

    async timeChange(obj) {
      const {
        dateRange
      } = obj
      this.dateRange = dateRange
      this.fetchListAndRender()
    },

    async componentChange(componentType) {
      this.componentType = componentType
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
    const res = await fetchVueComponentRenderList({
      st: moment(moment().format('YYYY/MM/DD 00:00'), 'YYYY/MM/DD HH:mm:ss').unix() * 1000,
      et: moment(moment().format('YYYY/MM/DD 23:59'), 'YYYY/MM/DD HH:mm:ss').unix() * 1000,
      component_type: this.componentType
    })
    this.chartData = this.getViewData(res.data)
    this.isSpinShowDetail = false
  }
}
</script>

<style lang="less" scoped>
.vue-component-render-container .filter-container {
  position: relative;
  display: flex;
  justify-content: space-around;
}
.vue-component-render-container .time-bar {
  width: 700px;
}
.vue-component-render-container .component-select {
  width: 200px;
}
</style>