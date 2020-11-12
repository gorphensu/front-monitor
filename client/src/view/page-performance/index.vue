<template>
  <div class="container">
    <Card>
      <Form inline ref="searchForm" :model="searchForm">
        <FormItem prop="url">
          <Select v-model="searchForm.url" clearable placeholder="请选择站点" style="width: 250px;">
            <Option v-for="item in urlOptions" :key="item.value" :value="item.value">{{ item.label }}</Option>
          </Select>
        </FormItem>
        <FormItem prop="date">
          <DatePicker v-model="searchForm.date" @on-change="dateChangeHandler" format="yyyy/MM/dd" type="daterange" placement="bottom-end" placeholder="时间范围"></DatePicker>
        </FormItem>
        <!-- <FormItem prop="version">
          <Select v-model="searchForm.version" placeholder="请选择版本">
            <Option v-for="item in versionOptions" :key="item.value" :value="item.value">{{ item.label }}</Option>
          </Select>
        </FormItem> -->

        <FormItem>
          <Button type="primary" @click="search">搜索</Button>
        </FormItem>
      </Form>
      <!-- <v-chart :force-fit="true" :height="400" :data="listDatas" :adjust="adjust">
        <v-tooltip />
        <v-axis />
        <v-legend />
        <v-bar color="app_version" position="指标*耗时"></v-bar>
      </v-chart> -->
      <div ref="dom" class="charts chart-bar" style="width: 100%;height: 400px;"></div>
    </Card>
  </div>
</template>

<script>
import moment from 'moment'
import DataSet from '@antv/data-set'
import echarts from 'echarts'
// import {
//   fetchUrlList
// } from '@/api/performance'
import {
  fetchVersionList,
  fetchUrlList,
  fetchPagePerformanceList
} from '@/api/page-performance'
export default {
  data() {
    return {
      searchForm: {
        version: '',
        url: '',
        date: [moment().subtract(1, 'days').format('yyyy/MM/DD'), moment().subtract(1, 'days').format('yyyy/MM/DD')]
      },
      versionOptions: [],
      urlOptions: [],
      listDatas: [],
      adjust: [{
        type: 'dodge',
        marginRatio: 1 / 32,
      }],
      option: {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: []
        },
        xAxis: [{
          type: 'category',
          axisTick: { show: false },
          data: []
        }],
        yAxis: [{
          type: 'value'
        }],
        series: []
      },
      labelOption: {
        show: true,
        formatter: '{c}  {name|{a}}',
        fontSize: 16
      }
    }
  },
  created() {
    this.getUrlDatas()
    this.getDatas()
    // this.getVersionDatas()
  },
  methods: {
    dateChangeHandler() {
      this.getUrlDatas()
      // this.getVersionDatas()
    },
    async getDatas() {
      let st = this.searchForm.date[0] || moment().subtract(1, 'days').format('yyyy/MM/DD')
      let et = this.searchForm.date[1] || moment().subtract(1, 'days').format('yyyy/MM/DD')

      st = +moment(st)
      et = +moment(et).add(1, 'days').subtract(1, 'seconds')

      let res = await fetchPagePerformanceList({
        url: this.searchForm.url,
        st,
        et,
        summaryBy: 'day'
      })
      let resObj = this.formatListData(res.data)
      // this.listDatas = res
      // debugger
      // const dv = new DataSet.View().source(resObj.data)
      // // const versions = resObj.key
      // dv.transform({
      //   type: 'fold',
      //   fields: ['DOM解析耗时', '资源加载耗时', '首次渲染耗时', '首包时间耗时', '首次可交互耗时', 'DOM_READY_耗时', '页面完全加载耗时'],
      //   key: '指标',
      //   value: '耗时'
      // })
      // this.listDatas = dv.rows
      this.setOption(resObj.data, resObj.key)
      let dom = echarts.init(this.$refs.dom)
      dom.setOption(this.option)

    },
    setOption(datas, versions) {
      this.option.legend.data = ['DOM解析耗时', '资源加载耗时', '首次渲染耗时', '首包时间耗时', '首次可交互耗时', 'DOM_READY_耗时', '页面完全加载耗时']
      this.option.xAxis[0].data = versions
      this.option.series = ['DOM解析耗时', '资源加载耗时', '首次渲染耗时', '首包时间耗时', '首次可交互耗时', 'DOM_READY_耗时', '页面完全加载耗时'].map(indictor => {
        return {
          name: indictor,
          type: 'bar',
          // label: this.labelOption,
          data: datas.map(data => {
            return (data[indictor]/ 1000).toFixed(2)
          })
        }
      })
    },
    formatListData(datas) {
      let map = {}
      datas.forEach(data => {
        let { app_version } = data
        let tmpData = map[app_version]
        if (!tmpData) {
          tmpData = {
            app_version: data.app_version,
            'DOM解析耗时': data.dom_parse_ms,
            '资源加载耗时': data.load_resource_ms,
            '首次渲染耗时': data.first_render_ms,
            '首包时间耗时': data.first_tcp_ms,
            '首次可交互耗时': data.first_response_ms,
            'DOM_READY_耗时': data.dom_ready_ms,
            '页面完全加载耗时': data.load_complete_ms,
            count_size: data.count_size
          }
        } else {
          tmpData['DOM解析耗时'] = (tmpData['DOM解析耗时'] * tmpData.count_size + data['dom_parse_ms'] * data.count_size) / (tmpData.count_size + data.count_size)
          tmpData['资源加载耗时'] = (tmpData['资源加载耗时'] * tmpData.count_size + data['load_resource_ms'] * data.count_size) / (tmpData.count_size + data.count_size)
          tmpData['首次渲染耗时'] = (tmpData['首次渲染耗时'] * tmpData.count_size + data['first_render_ms'] * data.count_size) / (tmpData.count_size + data.count_size)
          tmpData['首包时间耗时'] = (tmpData['首包时间耗时'] * tmpData.count_size + data['first_tcp_ms'] * data.count_size) / (tmpData.count_size + data.count_size)
          tmpData['首次可交互耗时'] = (tmpData['首次可交互耗时'] * tmpData.count_size + data['first_response_ms'] * data.count_size) / (tmpData.count_size + data.count_size)
          tmpData['DOM_READY_耗时'] = (tmpData['DOM_READY_耗时'] * tmpData.count_size + data['dom_ready_ms'] * data.count_size) / (tmpData.count_size + data.count_size)
          tmpData['页面完全加载耗时'] = (tmpData['页面完全加载耗时'] * tmpData.count_size + data['load_complete_ms'] * data.count_size) / (tmpData.count_size + data.count_size)
          tmpData.count_size = tmpData.count_size + data.count_size
        }
        map[app_version] = tmpData
      })
      return {
        data: Object.values(map),
        key: Object.keys(map)
      }
    },
    async getUrlDatas() {
      let st = this.searchForm.date[0] || moment().subtract(1, 'days').format('yyyy/MM/DD')
      let et = this.searchForm.date[1] || moment().subtract(1, 'days').format('yyyy/MM/DD')

      st = +moment(st)
      et = +moment(et).add(1, 'days').subtract(1, 'seconds')
      let res = await fetchUrlList({
        summaryBy: 'hour',
        st,
        et
      })
      this.urlOptions = res.data.map(item => {
        return {
          value: item[item.length - 1] === '/' ? item.slice(0, -1) : item,
          label: item[item.length - 1] === '/' ? item.slice(0, -1) : item
        }
      })
    },
    async getVersionDatas() {
      let st = this.searchForm.date[0] || moment().subtract(1, 'days').format('yyyy/MM/DD')
      let et = this.searchForm.date[1] || moment().subtract(1, 'days').format('yyyy/MM/DD')

      st = +moment(st)
      et = +moment(et).add(1, 'days').subtract(1, 'seconds')
      let res = await fetchVersionList({
        summaryBy: 'hour',
        st,
        et
      })
      this.versionOptions = res.data.map(item => {
        return {
          value: item[item.length - 1] === '/' ? item.slice(0, -1) : item,
          label: item[item.length - 1] === '/' ? item.slice(0, -1) : item
        }
      })
    },
    search() {
      this.getDatas()
    }
  }
}
</script>

<style lang="less" scoped>
</style>