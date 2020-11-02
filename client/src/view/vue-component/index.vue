<template>
  <div>
    <Layout>
      <Content>
        <Table :columns="columns" :data="listData" border height="500"></Table>
      </Content>
    </Layout>
  </div>
</template>

<script>
import moment from 'moment'
import { fetchPageEngineCtrlsList } from '@/api/page-engine-ctrls'

export default {
  data() {
    return {
      listData: [],
      columns: []
    }
  },
  created() {
    this.getData()
  },
  methods: {
    fetchDatas() {
      return fetchPageEngineCtrlsList({
        et: Number(moment().add(1, 'days').set('second', 0).set('minute', 0).set('hour', 0)),
        st: Number(moment().subtract(6, 'months').set('second', 0).set('minute', 0).set('hour', 0)),
        type: 'day',
        pagesize: 999999
      })
    },
    async getData() {
      var res = await this.fetchDatas()
      if (res.data && res.data.data) {
        let listData = this.formatData(res.data.data)
        this.columns = this.formatColumns(listData)
        this.listData = this.formatListData(listData)
      }
    },
    formatData(datas) {
      let versions = []
      let operations = []
      let componentTypesMap = {}
      datas.forEach(data => {
        const { component_type, operation_type, app_version, cost_time, count_size } = data
        if (!componentTypesMap[component_type]) {
          componentTypesMap[component_type] = {}
        }
        if (!componentTypesMap[component_type][app_version || '_']) {
          componentTypesMap[component_type][app_version || '_'] = {}
        }
        if (!componentTypesMap[component_type][app_version || '_'][operation_type]) {
          componentTypesMap[component_type][app_version || '_'][operation_type] = cost_time
        } else {
          // 已经存在了
          let oldCost_time = componentTypesMap[component_type][app_version || '_'][operation_type]
          componentTypesMap[component_type][app_version || '_'][operation_type] = (oldCost_time + (cost_time * count_size)) / (count_size + 1)
        }
        if (operations.indexOf(operation_type) < 0) {
          operations.push(operation_type)
        }
        if (versions.indexOf(app_version) < 0) {
          versions.push(app_version)
        }
      })
      return {
        versions,
        operations,
        data: componentTypesMap
      }
    },
    formatColumns(data) {
      let columns = [{
        title: 'component_type',
        key: 'component_type',
        width: 100,
        sort: 1
      }]
      data.versions.forEach(version => {
        let column = {
          title: version || '_',
          // key: version || ['_'],
          // width: 400,
          children: [],
          sort: !version ? 2 : ''
        }
        data.operations.forEach(operation => {
          column.children.push({
            title: operation,
            key: `${version || '_'}:${operation}`,
            width: 80
          })
        })
        columns.push(column)
      })
      columns = columns.sort((a, b) => {
        if (a.sort && b.sort) {
          return a.sort - b.sort
        }
        if (a.sort) {
          return 1
        }
        if (b.sort) {
          return 1
        }
        let aVersion = a.title.replace(/v/gi, '').split('')
        let bVersion = b.title.replace(/v/gi, '').split('')
        let secondAVersion = aVersion.slice(1).join('')
        let secondBVersion = bVersion.slice(1).join('')
        if (Number(secondAVersion) - Number(secondBVersion)) {
          return Number(secondAVersion) - Number(secondBVersion)
        } else {
          let threeAVersion = aVersion.slice(2).join('')
          let threeBVersion = bVersion.slice(2).join('')
          return Number(threeAVersion) - Number(threeBVersion)
        }
      })
      return columns
    },
    formatListData(data) {
      // componentTypesMap[component_type][app_version || '_'][operation_type] = 'time'
      let res = []
      for (let component_type in data.data) {
        let item = {
          component_type
        }
        for (let app_version in data.data[component_type]) {
          for (let operation_type in data.data[component_type][app_version || '_']) {
            item[`${app_version || '_'}:${operation_type}`] = data.data[component_type][app_version || '_'][operation_type].toFixed(2)
          }
          // for (let operation_type in data.data[component_type][app_version || '_']) {
          // res.push({
          //   component_type,
          //   [app_version || '_']: data.data[component_type][app_version || '_'][operation_type],
          //   [operation_type]: data.data[component_type][app_version || '_'][operation_type]
          // })
          // }
        }
        res.push(item)
      }
      return res
    }
  }
}
</script>

<style lang="less" scoped>
</style>