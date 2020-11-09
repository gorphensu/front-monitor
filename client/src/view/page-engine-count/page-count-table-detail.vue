<template>
  <div>
    {{ params }}
    <Table height="400" :columns="listColumns" :data="listData"></Table>
    <Page class="table-footer" :total="total" :current="current" :page-size="pageSize" show-total @on-change="pageChangeHandler" />
  </div>
</template>

<script>
import PageCountDetailExpand from './page-count-detail-expand.vue'
import { fetchPageEngineCountDetailList } from '@/api/page-engine-count'

export default {
  props: {
    row: Object,
    params: Object
  },
  data() {
    return {
      listColumns: [{
        title: '',
        type: 'expand',
        render(h, params) {
          return h(PageCountDetailExpand, {
            props: {
              row: params.row
            }
          })
        }
      }, {
        title: '表单编码',
        key: 'pagecode',
      }, {
        title: '版本',
        key: 'app_version'
      }, {
        title: '租户',
        key: 'tenantid'
      }, {
        title: '站点',
        key: 'url'
      }, {
        title: '耗时',
        key: 'loaded_time'
      }, {
        title: 'ucid',
        key: 'ucid'
      }],
      listData: [],
      current: 1,
      pageSize: 20,
      total: 0
    }
  },
  created() {
    this.getPageCountDetail()
  },
  methods: {
    async getPageCountDetail() {
      let params = {
        ...this.params,
        pagecode: this.row.pagecode,
        app_version: this.row.app_version,
        tenantid: this.row.tenantid,
        url: this.row.url,
        pageindex: this.current,
        pagesize: this.pageSize
      }
      delete params.start_loaded_time
      delete params.end_loaded_time

      let res = await fetchPageEngineCountDetailList(params)
      this.listData = res.data.data
      this.total = res.data.total
      this.pageSize = +res.data.pagesize
      this.current = +res.data.pageindex
    },
    pageChangeHandler(pageindex) {
      this.current = pageindex
      this.getPageCountDetail()
    }
  }
}
</script>

<style lang="less" scoped>
</style>