<template>
  <div>
    <Form inline ref="pieForm" :model="pieForm">
      <FormItem prop="version">
        <Select v-model="pieForm.version" placeholder="请选择版本">
          <Option v-for="item in versionOptions" :key="item.value" :value="item.value">{{ item.label }}</Option>
        </Select>
      </FormItem>
      <FormItem prop="tenantid">
        <Select v-model="pieForm.tenantid" placeholder="请选择租户">
          <Option v-for="item in tenantidOptions" :key="item.value" :value="item.value">{{ item.label }}</Option>
        </Select>
      </FormItem>
      <FormItem prop="url">
        <Select v-model="pieForm.url" placeholder="请选择站点">
          <Option v-for="item in urlOptions" :key="item.value" :value="item.value">{{ item.label }}</Option>
        </Select>
      </FormItem>
      <FormItem prop="date">
        <DatePicker v-model="pieForm.date" format="yyyy/MM/dd" type="daterange" placement="bottom-end" placeholder="时间范围"></DatePicker>
      </FormItem>
      <FormItem>
        <Button type="primary" @click="search">搜索</Button>
      </FormItem>
    </Form>
    <v-chart :force-fit="true" :height="400" :data="pieChartData" :scale="pieScale">
      <v-pie position="percent" color="type" :label="pieLabel" :select="false" />
      <v-coord type="theta" :radius="0.75" :innerRadius="0.6" />
    </v-chart>
  </div>
</template>

<script>
import moment from 'moment'
import { fetchPageEngineCountSummary } from '@/api/page-engine-count'
import DataSet from '@antv/data-set'
// import { merge } from 'lodash/merge'
export default {
  data() {
    return {
      pieForm: {
        version: '',
        tenantid: '',
        url: '',
        date: [moment().subtract(1, 'days').format('yyyy/MM/DD'), moment().subtract(1, 'days').format('yyyy/MM/DD')]
      },
      versionOptions: [{
        label: '全部',
        value: ''
      }],
      tenantidOptions: [{
        label: '全部',
        value: ''
      }],
      urlOptions: [{
        label: '全部',
        value: ''
      }],
      pieChartData: [],
      pieScale: [{
        dataKey: 'percent',
        min: 0,
        formatter: '.00%'
      }],
      pieLabel: ['percent', {
        formatter: (val, item) => {
          return item.point.type + ':  ' + val
        }
      }]
    }
  },
  created() {
    this.getData()
  },
  methods: {
    search() {
      this.getData()
    },
    async getData() {
      let st = this.pieForm.date[0] || moment().subtract(1, 'days').format('yyyy/MM/DD')
      let et = this.pieForm.date[1] || moment().subtract(1, 'days').format('yyyy/MM/DD')

      st = +moment(st)
      et = +moment(et).add(1, 'days').subtract(1, 'seconds')

      let res = await fetchPageEngineCountSummary({
        app_version: this.pieForm.version,
        tenantid: this.pieForm.tenantid,
        url: this.pieForm.url,
        st,
        et
      })
      let { list, pieData, urls, tenantids, versions } = this.formatData(res.data)
      this.pieChartData = pieData
      this.tenantidOptions = this.mergeOptions(this.tenantidOptions, tenantids)
      this.versionOptions = this.mergeOptions(this.versionOptions, versions)
      this.urlOptions = this.mergeOptions(this.urlOptions, urls)
    },
    mergeOptions(datas, arr = []) {
      let res = datas.slice()
      arr = arr.map(item => {
        return {
          label: item,
          value: item
        }
      })
      for (let item of arr) {
        let isExist = res.find(data => {
          return item.value === data.value
        })
        if (!isExist) {
          res.push(item)
        }
      }
      return res
    },
    formatData(datas) {
      let map = {
        '4s以下': [],
        '4-7s': [],
        '7-10s': [],
        '10s以上': []
      }
      let versions = []
      let tenantids = []
      let urls = []
      datas.forEach(data => {
        let { loaded_time } = data
        if (loaded_time <= 4000) {
          data['loaded_time_group'] = '4s以下'
          map['4s以下'].push(data)
        } else if (loaded_time > 4000 && loaded_time <= 7000) {
          data['loaded_time_group'] = '4-7s'
          map['4-7s'].push(data)
        } else if (loaded_time > 7000 && loaded_time <= 10000) {
          data['loaded_time_group'] = '7-10s'
          map['7-10s'].push(data)
        } else {
          data['loaded_time_group'] = '10s以上'
          map['10s以上'].push(data)
        }
        if (data.app_version && versions.indexOf(data.app_version) < 0) {
          versions.push(data.app_version)
        }
        if (data.tenantid && tenantids.indexOf(data.tenantid) < 0) {
          tenantids.push(data.tenantid)
        }
        if (data.url && urls.indexOf(data.url) < 0) {
          urls.push(data.url)
        }
      })
      let pieData = {}
      Object.keys(map).forEach(key => {
        let items = map[key]
        pieData[key] = items.length / datas.length
      })

      return {
        versions,
        urls,
        tenantids,
        list: datas,
        dataMap: map,
        pieData: Object.keys(pieData).map(key => {
          return {
            type: key,
            percent: pieData[key]
          }
        })
      }
    }
  }
}
</script>
<style lang="less" scoped>
</style>