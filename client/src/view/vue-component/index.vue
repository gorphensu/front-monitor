<template>
  <div>
    <Layout>
      <Content>adf</Content>
    </Layout>
  </div>
</template>

<script>
import moment from 'moment'
import { fetchPageEngineCtrlsList } from '@/api/page-engine-ctrls'
export default {
  data() {
    return {
      listData: {}
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
        this.listData = this.formatListData(res.data.data)
      }
    },
    formatListData(datas) {
      let versions = []
      let compTypes = []
      
    }
  }
}
</script>

<style lang="less" scoped>
</style>