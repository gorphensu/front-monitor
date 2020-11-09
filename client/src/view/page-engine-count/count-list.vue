<template>
  <div>
    <Form inline ref="listForm" :model="listForm">
      <FormItem prop="pagecode">
        <Input type="text" placeholder="表单编码" v-model="listForm.pagecode" />
      </FormItem>
      <FormItem prop="version">
        <Select v-model="listForm.version" placeholder="请选择版本">
          <Option v-for="item in versionOptions" :key="item.value" :value="item.value">{{ item.label }}</Option>
        </Select>
      </FormItem>
      <FormItem prop="tenantid">
        <Select v-model="listForm.tenantid" placeholder="请选择租户">
          <Option v-for="item in tenantidOptions" :key="item.value" :value="item.value">{{ item.label }}</Option>
        </Select>
      </FormItem>
      <FormItem prop="url">
        <Select v-model="listForm.url" placeholder="请选择站点">
          <Option v-for="item in urlOptions" :key="item.value" :value="item.value">{{ item.label }}</Option>
        </Select>
      </FormItem>
      <FormItem prop="date">
        <DatePicker v-model="listForm.date" format="yyyy/MM/dd" type="daterange" placement="bottom-end" placeholder="时间范围"></DatePicker>
      </FormItem>
      <FormItem prop="loaded_time">
        <Select v-model="listForm.loaded_time" placeholder="请选择加载时间范围">
          <Option v-for="item in loadedTimeOptions" :key="item.value" :value="item.value">{{ item.label }}</Option>
        </Select>
      </FormItem>
      <FormItem>
        <Button type="primary" @click="search">搜索</Button>
        <Button type="info" @click="exportHandler">导出</Button>
      </FormItem>
    </Form>
    <div class="dt-table-container">
      <Table height="400" :columns="listColumns" :data="listData">
        <template slot="pagecode" slot-scope="{ row }">
          <span class="link" @click="linkHandler(row)">{{ row.pagecode }}</span>
        </template>
      </Table>
      <Page class="table-footer" :total="total" :current="current" :page-size="pageSize" show-sizer show-total @on-change="pageChangeHandler" @on-page-size-change="pageSizeChangeHandler" />
    </div>
    <Modal v-model="pageCountDetailVisible" width="1000" title="表单详情" :closable="false" :mask-closable="false">
      <PageCountTableDetail v-if="pageCountDetailVisible" :row="selectRow" :params="selectParams"></PageCountTableDetail>
      <div slot="footer">
        <Button type="default" @click="closePageCountDetailModal">关闭</Button>
      </div>
    </Modal>
  </div>
</template>

<script>
import moment from 'moment'
import { fetchPageEngineCountList, exportPageEngineCountList } from '@/api/page-engine-count'
import DataSet from '@antv/data-set'
import PageCountTableDetail from './page-count-table-detail.vue'
export default {
  components: {
    PageCountTableDetail
  },
  data() {
    return {
      pageCountDetailVisible: false,
      selectRow: {},
      selectParams: {},
      listForm: {
        pagecode: '',
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
      loadedTimeOptions: [{
        title: '全部',
        value: ''
      }, {
        label: '10s以上',
        value: '10'
      }, {
        label: '7-10s',
        value: '7-10'
      }, {
        label: '7s以上',
        value: '7'
      }, {
        label: '4-7s',
        value: '4-7'
      }, {
        label: '4s以下',
        value: '4'
      }],
      // '4s以下': [],
      //   '4-7s': [],
      //   '7-10s': [],
      //   '10s以上': []
      listColumns: [{
        title: '表单编码',
        key: 'pagecode',
        slot: 'pagecode'
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
        title: '统计次数',
        key: 'count_size'
      }],
      listData: [],
      total: 0,
      current: 1,
      pageSize: 20
    }
  },
  created() {
    this.getData()
  },
  methods: {
    closePageCountDetailModal() {
      this.pageCountDetailVisible = false
    },
    linkHandler(row) {
      this.pageCountDetailVisible = true
      this.selectRow = row
      let params = this.getParams()
      this.selectParams = params
    },
    getParams() {
      let st = this.listForm.date[0] || moment().subtract(1, 'days').format('yyyy/MM/DD')
      let et = this.listForm.date[1] || moment().subtract(1, 'days').format('yyyy/MM/DD')

      st = +moment(st)
      et = +moment(et).add(1, 'days').subtract(1, 'seconds')
      let start_loaded_time = 0
      let end_loaded_time = 0
      if (!this.listForm.loaded_time) {
        // start_loaded_time = 0
        // end_loaded_time = 0
      } else {
        let setLoadedTime = this.listForm.loaded_time
        if (setLoadedTime === '4') {
          end_loaded_time = 4000
        } else if (setLoadedTime === '4-7') {
          start_loaded_time = 4000
          end_loaded_time = 7000
        } else if (setLoadedTime === '7-10') {
          start_loaded_time = 7000
          end_loaded_time = 10000
        } else if (setLoadedTime === '10') {
          start_loaded_time = 10000
        } else if (setLoadedTime === '7') {
          start_loaded_time = 7000
        }
      }
      return {
        app_version: this.listForm.version,
        tenantid: this.listForm.tenantid,
        url: this.listForm.url,
        pagecode: this.listForm.pagecode,
        st,
        et,
        pageindex: this.current,
        pagesize: this.pageSize,
        start_loaded_time,
        end_loaded_time
      }
    },
    exportHandler() {
      let params = this.getParams()
      exportPageEngineCountList(params)
    },
    search() {
      this.current = 1
      this.getData()
    },
    async getData() {
      let params = this.getParams()
      let res = await fetchPageEngineCountList(params)
      this.listData = res.data.data
      this.total = res.data.total
      this.pageSize = +res.data.pagesize
      this.current = +res.data.pageindex

      let { versions, urls, tenantids } = this.getOtherDatas(res.data.data)
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
    getOtherDatas(datas) {
      let versions = []
      let urls = []
      let tenantids = []
      datas.forEach(data => {
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
      return {
        versions,
        urls,
        tenantids
      }
    },
    pageChangeHandler(page) {
      this.current = page
      this.getData()
    },
    pageSizeChangeHandler(pageSize) {
      this.pageSize = pageSize
      this.getData()
    }
  }
}
</script>

<style lang="less" scoped>
.dt-table-container {
  .table-footer {
    text-align: center;
    margin-top: 10px;
  }
  .link {
    color: #2d8cf0;
    text-decoration: underline;
    cursor: pointer;
  }
}
</style>