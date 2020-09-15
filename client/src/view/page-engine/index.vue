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
          <span>表单加载耗时统计</span>
          <div style="height: 400px">
            <Loading :isSpinShow="isShowLoading"></Loading>
            <v-chart :force-fit="true" :height="height" :data="pieChartData" :scale="pieScale">
              <v-pie position="percent" color="type" :label="label" :select="false" />
              <v-coord type="theta" />
            </v-chart>
          </div>
          <span>控件数量与渲染时间的关系</span>
          <div style="height: 400px;">
            <v-chart :force-fit="true" :height="height" :data="chartData">
              <v-axis />
              <v-tooltip :onChange="itemFormatter" />
              <v-point
                position="ctrlsize*render_time"
                :size="4"
                :opacity="0.65"
                shape="circle"
                color="containertype"
                :onClick="pointClickHandler"
              />
              <!-- <v-view
                :data="getDataByCtrlSizeAndRenderTime(chartData)"
                :scale="ctrlSizeAndRenderTimeScale"
              >
                <v-line position="ctrlsize*render_time" />
              </v-view>-->
              <!-- <v-view :data="chartData">
                <v-point
                  position="ctrlsize*render_time"
                  :size="4"
                  :opacity="0.65"
                  shape="circle"
                  color="containertype"
                  :onClick="pointClickHandler"
                />
              </v-view>-->
            </v-chart>
          </div>

          <span>控件数量与加载时间的关系</span>
          <div style="height: 400px;">
            <Loading :isSpinShow="isShowLoading"></Loading>
            <v-chart :force-fit="true" :height="height" :data="chartData">
              <v-axis />
              <v-tooltip :onChange="itemFormatter" />
              <!-- <v-view :data="chartData" :scale="ctrlSizeAndLoadedTimeScale">
                <v-point
                  position="ctrlsize*loaded_time"
                  :size="4"
                  :opacity="0.65"
                  shape="circle"
                  color="containertype"
                  :onClick="pointClickHandler"
                />
              </v-view>-->
              <v-point
                position="ctrlsize*loaded_time"
                :size="4"
                :opacity="0.65"
                shape="circle"
                color="containertype"
                :onClick="pointClickHandler"
              />
              <!-- <v-view
                :data="getDataByCtrlSizeAndLoadedTime(chartData)"
                :scale="ctrlSizeAndLoadedTimeScale"
              >
                <v-line position="ctrlsize*loaded_time" />
              </v-view>-->
            </v-chart>
          </div>

          <div>
            <span>事件数量与加载时间的关系</span>
          </div>
          <div style="height: 400px;">
            <Loading :isSpinShow="isShowLoading"></Loading>
            <v-chart :force-fit="true" :height="height" :data="chartData">
              <v-axis data-key="loaded_time" />
              <v-tooltip :onChange="itemFormatter" />
              <v-point
                position="loaded_eventsize*loaded_time"
                :size="4"
                :opacity="0.65"
                color="containertype"
                shape="circle"
                :onClick="pointClickHandler"
              />
            </v-chart>
          </div>
        </Card>
      </i-col>
    </Row>
    <Modal v-model="detailModal" title="详情" @on-visible-change="modalStateChange">
      <ul class="g2-tooltip-list-item">
        <li data-v-gtlv>表单：{{detailData.pagecode}}</li>
        <li data-v-gtlv>渲染时长：{{this.MillisecondToDate(detailData.render_time)}}</li>
        <li data-v-gtlv>控件数量：{{detailData.ctrlsize}}</li>
        <li data-v-gtlv>加载时长：{{this.MillisecondToDate(detailData.loaded_time)}}</li>
        <li data-v-gtlv>事件数量：{{detailData.loaded_eventsize}}</li>
        <li data-v-gtlv>
          事件列表：
          <div
            v-for="(item, index) in detailData.loaded_event_detail"
            :key="index"
          >{{getEventDetail(item)}}</div>
        </li>
        <li data-v-gtlv>
          容器控件：
          <div
            v-for="(item, index) in detailData.container_ctrl_detail"
            :key="index"
          >{{getContainerCtrlDetail(item)}}</div>
        </li>
        <li data-v-gtlv>租户：{{detailData.tenantid}}</li>
        <li data-v-gtlv>用户：{{detailData.ucid}}</li>
        <li data-v-gtlv>浏览地址：{{detailData.url}}</li>
      </ul>
    </Modal>
  </div>
</template>

<script>
import TimeBar from '@/view/components/time-bar'
import Loading from '@/view/components/loading/loading.vue'
import { fetchSummaryPageEngineRenderList, fetchSummaryPageEngineRenderSummary } from '@/api/page-engine-render'
import moment from 'moment'
import DataSet from '@antv/data-set'
import { Modal } from 'iview'

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
      detailModal: false,
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
      ctrlSizeAndRenderTimeScale: [{
        dataKey: 'ctrlsize',
        sync: true
      }, {
        dataKey: 'render_time',
        sync: true
      }],
      ctrlSizeAndLoadedTimeScale: [{
        dataKey: 'ctrlsize',
        sync: true
      }, {
        dataKey: 'loaded_time',
        sync: true
      }],
      detailData: {},
      label: ['percent', {
        formatter: (val, item) => {
          return item.point.type + ':  ' + val
        }
      }],
      pieChartData: [],
      pieScale: [{
        dataKey: 'percent',
        min: 0,
        formatter: '.0%'
      }]
    }
  },
  methods: {
    modalStateChange(state) {
      if (!state) {
        this.detailData = {}
        this.detailModal = false
      }
    },
    getEventDetail(eventDetailItem) {
      let res = {}
      Object.keys(eventDetailItem).forEach(key => {
        res.key = key
        res.value = eventDetailItem[key]
      })
      return `code: ${res.key} => ${res.value}`
      // return res
    },
    getContainerCtrlDetail(ctrlDetailItem) {
      let res = {}
      Object.keys(ctrlDetailItem).forEach(key => {
        res.code = key
        res.type = ctrlDetailItem[key].type
        res.detail = JSON.stringify(ctrlDetailItem[key])
      })
      return `type: ${res.type} => detail: ${res.detail}`
    },
    pointClickHandler(eventPoint) {
      let data = eventPoint.data._origin
      try {
        data.loaded_event_detail = JSON.parse(data.loaded_event_detail)
        data.container_ctrl_detail = JSON.parse(data.container_ctrl_detail)
        this.detailModal = true
      } catch {
        data.loaded_event_detail = []
        data.container_ctrl_detail = []
      }
      this.detailData = data
    },
    itemFormatter(e) {
      let attrs = e.tooltip._attrs
      if (e.items) {
        const items = e.items[0]
        // let val = items.value
        let pagecode = items.point._origin.pagecode
        let operationType = items.point._origin.operation_type
        let browser = items.point._origin.browser
        let url = items.point._origin.url || ''
        let render_time = items.point._origin.render_time
        let loaded_time = items.point._origin.loaded_time
        let ctrlsize = items.point._origin.ctrlsize
        let loaded_eventsize = items.point._origin.loaded_eventsize
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
          <li data-v-gtlv >渲染时长：${this.MillisecondToDate(render_time)}</li>
          <li data-v-gtlv >控件数量：${ctrlsize}</li>
          <li data-v-gtlv >加载时长：${this.MillisecondToDate(loaded_time)}</li>
          <li data-v-gtlv >事件数量：${loaded_eventsize}</li>
          <li data-v-gtlv>浏览地址：${url}</li>
        </ul>
        `
      }
    },

    getDataByCtrlSizeAndRenderTime(data = []) {
      try {
        const dv = new DataSet.View().source(data)
        dv.transform({
          type: 'filter',
          callback(row) {
            if (row.render_time > 20000) {
              return false
            }
            return true
          }
        })
        dv.transform({
          type: 'kernel-smooth.regression',
          method: 'gaussian',
          fields: ['ctrlsize', 'render_time'],
          as: ['ctrlsize', 'render_time']
        })
        return dv
      } catch (e) {
        console.error(e)
        this.isShowLoading = false
      }
    },

    getDataByCtrlSizeAndLoadedTime(data = []) {
      try {
        const dv = new DataSet.View().source(data)
        dv.transform({
          type: 'kernel-smooth.regression',
          method: 'gaussian',
          fields: ['ctrlsize', 'loaded_time'],
          as: ['ctrlsize', 'loaded_time'],
        })
        return dv
      } catch (e) {
        console.error(e)
        this.isShowLoading = false
      }
    },

    getViewData(data = []) {
      // 1 计算平均值
      let length = data.length
      let average_render_time = data.reduce((prev, current) => {
        return prev + (current.render_time || 0)
      }, 0) / length
      let average_loaded_time = data.reduce((prev, current) => {
        return prev + (current.loaded_time || 0)
      }, 0) / length
      data.forEach(item => {
        item.average_render_time = average_render_time
        item.average_loaded_time = average_loaded_time
        if (item.container_ctrl) {
          let containers = JSON.parse(item.container_ctrl)
          if (containers.length) {
            if (containers.indexOf('tabboard') > -1) {
              item.containertype = 'tabboard'
            } else if (containers.indexOf('table') > -1 || containers.indexOf('list')) {
              item.containertype = 'table'
            } else {
              item.containertype = 'single'
            }
          } else {
            item.containertype = 'single'
          }
        } else {
          item.containertype = 'single'
        }
      })
      // 这里做一下分类 有容器控件的 跟没有容器控件的
      return data
    },

    async fetchListAndRender() {
      this.isShowLoading = true
      try {
        const res = await fetchSummaryPageEngineRenderList({
          st: +moment(this.dateRange[0]),
          et: +moment(this.dateRange[1]),
          pagecode: this.pagecode,
          tenantid: this.tenantid,
          loadedtime: this.loadedTimeType
        })
        this.chartData = this.getViewData(res.data)
        this.isShowLoading = false
      } catch {
        this.chartData = []
        this.isShowLoading = false
      }
    },

    async fetchPieData() {
      try {
        let now = moment()
        let start = +moment(this.dateRange[0])
        let end = +moment(this.dateRange[1])
        // 如果开始时间是今天，需要提前一天，因为今天的数据需要第二天0时才提交统计
        if (now - start < 86400000) {
          start = start - 86400000
        }
        const res = await fetchSummaryPageEngineRenderSummary({
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
      } catch (e){
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
      this.fetchListAndRender()
      this.fetchPieData()
    },

    async pagecodeChange() {
      this.fetchListAndRender()
      this.fetchPieData()
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
    this.fetchPieData()
    const res = await fetchSummaryPageEngineRenderList({
      st: moment(moment().format('YYYY/MM/DD 00:00'), 'YYYY/MM/DD HH:mm:ss').unix() * 1000,
      et: moment(moment().format('YYYY/MM/DD 23:59'), 'YYYY/MM/DD HH:mm:ss').unix() * 1000,
      pagecode: this.pagechde,
      tenantid: this.tenantid,
      loadedtime: this.loadedTimeType
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