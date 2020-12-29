<template>
  <div class="conatiner">
    <Card v-for="(item, index) in componentTypeListData" :key="index">
      <div :ref="'dom-' + item[0]" class="charts chart-bar" style="width: 100%;height: 400px;"></div>
    </Card>
  </div>
</template>

<script>
import moment from 'moment'
import { fetchPageEngineDataTimeSummary } from '@/api/page-engine-data-time'
import echarts from 'echarts'

export default {
  data() {
    return {
      componentTypeListData: [],
      options: []
    }
  },
  created() {
    this.getData()
  },
  methods: {
    createOption(component_type, dataMap) {
      let option = {
        title: {
          text: component_type
        },
        xAxis: {
          type: 'category',
          data: ['0-50', '50-100', '100-200', '200-500', '500-1000', '1000-2000', '2000-5000', '5000-10000', '10000-20000', '20000-']
        },
        yAxis: {
          value: 'value'
        },
        series: []
      }
      let series = []
      Object.keys(dataMap).map(app_version => {
        let versionDatas = []
        let datas = dataMap[app_version]
        datas.forEach(item => {
          versionDatas.push([item.group_type, item.cost_time])
        })
        series.push(versionDatas)
      })
      option.series = series.map(serie => {
        return {
          type: 'scatter',
          data: serie
        }
      })
      
      return option
    },
    async getData() {
      let res = await this.fetchDatas()
      if (res.data && res.data.data) {
        let listData = res.data.data
        let groupDatas = this.groupByComponentType(listData)
        this.componentTypeListData = groupDatas
        this.componentTypeListData.forEach(([component_type, data]) => {
          this.options.push(this.createOption(component_type, data))
        })
        this.$nextTick(() => {
          this.options.forEach((option, index) => {
            if (this.$refs['dom-' + this.componentTypeListData[index][0]][0]) {
              let dom = echarts.init(this.$refs['dom-' + this.componentTypeListData[index][0]][0])
              dom.setOption(option)
            }
          })
        })
      }
    },
    groupByComponentType(list) {
      let res = {}
      list.forEach(data => {
        if (!res[data.component_type]) {
          res[data.component_type] = {}
        }
        if (!res[data.component_type][data.app_version]) {
          res[data.component_type][data.app_version] = []
        }
        res[data.component_type][data.app_version].push({
          app_version: data.app_version,
          cost_time: data.cost_time,
          component_type: data.component_type,
          group_type: data.group_type
        })
      })
      return Object.keys(res).map(component_type => {
        return [component_type, res[component_type]]
      })
    },
    async fetchDatas() {
      return fetchPageEngineDataTimeSummary({
        et: Number(moment().add(1, 'days').set('second', 0).set('minute', 0).set('hour', 0)),
        st: Number(moment().subtract(6, 'months').set('second', 0).set('minute', 0).set('hour', 0)),
        count_type: 'hour',
        pagesize: 999999
      })
    }
  }
}
</script>

<style lang="less" scoped>
</style>