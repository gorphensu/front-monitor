<template>
  <div class="page-onload-detail-list">
    <section>
      <List size="small" border :split="true">
        <PageOnloadItem class="list-header" slot="header" :rowData="pageListHeaderRow"> </PageOnloadItem>
        <ListItem v-for="item in pageListData.data" :key="item.id">
          <PageOnloadItem :rowData="item" @row-click="handleRowClick"></PageOnloadItem>
        </ListItem>
      </List>
      <Page :total="pageListData.total" size="small" :page-size="10" :current="10" slot="footer" @on-change="pageIndexChange" />
    </section>
    <section>
      <List size="small" border :split="true">
        <CtrlItem class="list-header" slot="header" :rowData="CtrlListHeaderRow"></CtrlItem>
        <listItem v-for="item in ctrlList" :key="item.id">
          <CtrlItem :rowData="item"></CtrlItem>
        </listItem>
      </List>
    </section>
  </div>
</template>

<script>
import PageOnloadItem from './page-onload-item.vue'
import CtrlItem from './ctrl-item.vue'
import { fetchPageOnloadListByPagecodeAndTenantid, fetchPageOnloadCtrlList } from '@/api/page-engine-onload'
export default {
  components: {
    PageOnloadItem,
    CtrlItem
  },
  props: {
  },
  data() {
    return {
      pageListHeaderRow: {
        pagecode: 'pagecode',
        url: 'url',
        tenantid: 'tenantid',
        loaded_time: 'loadedtime',
        browser: 'browser',
        ucid: 'ucid',
        count_at_time: 'count_at_time'
      },
      pageListData: {
        total: 0,
        data: [],
        pageindex: 1
      },
      tenantid: '',
      pagecode: '',
      st: 0,
      et: 0,
      CtrlListHeaderRow: {
        cost_time: 'cost_time',
        component_type: 'component_type',
        component_code: 'component_code',
        operation_type: 'operation_type'
      },
      ctrlList: []
    }
  },
  methods: {
    pageIndexChange(newIndex) {
      this.pageListData.pageindex = +newIndex
      this.updateList()
    },
    async updateList(rowData, filter) {
      if (rowData && filter) {
        let { tenantid, pagecode } = rowData
        let { st, et } = filter
        this.tenantid = tenantid || ''
        this.pagecode = pagecode
        this.st = st
        this.et = et
      }
      let res = await fetchPageOnloadListByPagecodeAndTenantid({
        tenantid: this.tenantid,
        pagecode: this.pagecode,
        st: this.st,
        et: this.et,
        pagesize: 10,
        pageindex: this.pageListData.pageindex
      })
      this.pageListData = res.data
    },
    async handleRowClick(row) {
      // 获取ctrl list
      let res = await fetchPageOnloadCtrlList({
        engine_item_id: row.item_id,
        create_time: row.create_time * 1000
      })
      this.ctrlList = res.data
    }
  }
}
</script>

<style lang="less">
.page-onload-detail-list {
  display: flex;
  flex-wrap: wrap;
  > section {
    // flex: 1;
    width: 100%;
  }
}
</style>