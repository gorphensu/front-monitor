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
            <v-chart :force-fit="true" :height="height" :scale="lineScale" :data="chartData">
              <v-tooltip :onChange="itemFormatter" />
              <v-axis data-key="date" />
              <v-line position="count_at_time*rendertime" color="date" />
              <v-point
                position="count_at_time*rendertime"
                color="date"
                :size="4"
                :shape="'circle'"
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
      lineScale: [{
        dataKey: 'count_at_time',
        min: 0,
        max: 1
      }],
      height: 400,
      componentType: '',
      dateRange: [moment(moment().subtract(1, 'days').format(DATE_FORMAT_BY_DAY)).toDate(), moment(moment().format(DATE_FORMAT_BY_DAY)).toDate()]
    }
  },
  methods: {
    itemFormatter(e) {
      let attrs = e.tooltip._attrs
      if (e.items) {
        const items = e.items[0]
        let val = items.value
        let componentType = items.point._origin.component_type
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
          <li data-v-gtlv >类型：${componentType}</li>
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
        return prev + current.render_time
      }, 0) / length
      data.forEach(item => {
        item['渲染时长'] = item.render_time
        item['平均时长'] = average
      })
      // 2 合并到各个项
      const dv = new DataSet.View().source(data)
      dv.transform({
        type: 'fold',
        fields: ['渲染时长', '平均时长'],
        key: 'date',
        value: 'rendertime'
      })
      return dv.rows
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